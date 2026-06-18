package com.roomrental.modules.finance.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.finance.application.dto.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.roomrental.modules.finance.application.event.*;
import com.roomrental.modules.finance.application.strategy.BillingContext;
import com.roomrental.modules.finance.application.strategy.BillingStrategy;
import com.roomrental.modules.finance.application.strategy.BillingStrategyFactory;
import com.roomrental.modules.finance.domain.model.Invoice;
import com.roomrental.modules.finance.domain.model.Invoice.InvoiceStatus;
import com.roomrental.modules.finance.domain.model.InvoiceDetail;
import com.roomrental.modules.finance.domain.model.MeterReading;
import com.roomrental.modules.finance.domain.model.ServiceUsage;
import com.roomrental.modules.finance.domain.repository.MeterReadingRepository;
import com.roomrental.modules.finance.domain.repository.InvoiceDetailRepository;
import com.roomrental.modules.finance.domain.repository.InvoiceRepository;
import com.roomrental.modules.finance.domain.repository.ServiceUsageRepository;
import com.roomrental.modules.finance.domain.repository.ResidentBalanceRepository;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import com.roomrental.modules.room.domain.model.Room;
import com.roomrental.modules.room.domain.repository.RoomRepository;
import com.roomrental.modules.service.domain.model.ServicePricing;
import com.roomrental.modules.service.domain.model.ServiceTierPricing;
import com.roomrental.modules.service.domain.model.RentalService;
import com.roomrental.modules.service.domain.repository.RentalServiceRepository;
import com.roomrental.modules.service.domain.repository.ServicePricingRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class InvoiceService {
    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);
    
    private final InvoiceRepository invoiceRepository;
    private final InvoiceDetailRepository invoiceDetailRepository;
    private final ContractRepository contractRepository;
    private final RoomRepository roomRepository;
    private final RentalServiceRepository rentalServiceRepository;
    private final ServiceUsageRepository serviceUsageRepository;
    private final ServicePricingRepository servicePricingRepository;
    private final MeterReadingRepository meterReadingRepository;
    private final ResidentBalanceRepository residentBalanceRepository;
    private final BillingStrategyFactory strategyFactory;
    private final ApplicationEventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            InvoiceDetailRepository invoiceDetailRepository,
            ContractRepository contractRepository,
            RoomRepository roomRepository,
            RentalServiceRepository rentalServiceRepository,
            ServiceUsageRepository serviceUsageRepository,
            ServicePricingRepository servicePricingRepository,
            MeterReadingRepository meterReadingRepository,
            ResidentBalanceRepository residentBalanceRepository,
            BillingStrategyFactory strategyFactory,
            ApplicationEventPublisher eventPublisher,
            ObjectMapper objectMapper) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceDetailRepository = invoiceDetailRepository;
        this.contractRepository = contractRepository;
        this.roomRepository = roomRepository;
        this.rentalServiceRepository = rentalServiceRepository;
        this.serviceUsageRepository = serviceUsageRepository;
        this.servicePricingRepository = servicePricingRepository;
        this.meterReadingRepository = meterReadingRepository;
        this.residentBalanceRepository = residentBalanceRepository;
        this.strategyFactory = strategyFactory;
        this.eventPublisher = eventPublisher;
        this.objectMapper = objectMapper;
    }

    @Async("taskExecutor")
    @Transactional(rollbackFor = Exception.class)
    public CompletableFuture<Void> generateForMotel(InvoiceGenerateCommand command) {
        log.info("Starting async invoice generation for motelId={}, billingMonth={}", command.motelId(), command.billingMonth());
        try {
            List<InvoiceResult> results = new ArrayList<>();
            List<SkippedInvoiceRoomResult> skippedRooms = new ArrayList<>();
            List<Room> rooms = roomRepository.findByMotelId(command.motelId(), Pageable.unpaged()).getContent();

            for (Room room : rooms) {
                List<Contract> contracts = contractRepository.findByRoomId(room.getId()).stream()
                        .filter(Contract::isActive)
                        .toList();
                if (contracts.isEmpty()) {
                    continue;
                }

                Contract contract = contracts.get(0);

                // Check duplicate
                if (invoiceRepository.existsByContractIdAndBillingMonth(contract.getId(), command.billingMonth())) {
                    continue;
                }

                try {
                    InvoiceResult res = generateForSingleContract(contract, command.billingMonth());
                    if (res != null) {
                        results.add(res);
                    } else {
                        skippedRooms.add(new SkippedInvoiceRoomResult(
                            room.getId(), room.getRoomNumber(), "Missing APPROVED meter reading for at least one meter-based service"));
                    }
                } catch (Exception ex) {
                    log.error("Failed to generate invoice in motel loop for contractId={}", contract.getId(), ex);
                    skippedRooms.add(new SkippedInvoiceRoomResult(
                        room.getId(), room.getRoomNumber(), "Error: " + ex.getMessage()));
                }
            }

            log.info("Completed async invoice generation for motelId={}, billingMonth={}, created={}, skipped={}",
                    command.motelId(), command.billingMonth(), results.size(), skippedRooms.size());
            return CompletableFuture.completedFuture(null);
        } catch (Exception ex) {
            log.error("Async invoice generation failed for motelId={}, billingMonth={}", command.motelId(), command.billingMonth(), ex);
            throw ex;
        }
    }

    @Transactional(rollbackFor = Exception.class)
    public InvoiceResult generateForSingleContract(Contract contract, LocalDate billingMonth) {
        UUID tenantId = contract.getTenantId();
        Room room = roomRepository.findById(contract.getRoomId())
                .orElseThrow(() -> BaseException.notFound("Room", contract.getRoomId()));

        List<ServiceUsage> billableUsages = serviceUsageRepository.findBillableByRoomId(room.getId());
        Map<Long, MeterReading> approvedReadings = meterReadingRepository.findByRoomIdAndBillingMonth(room.getId(), billingMonth)
                .stream()
                .filter(r -> r.getStatus() == MeterReading.MeterReadingStatus.APPROVED)
                .collect(Collectors.toMap(MeterReading::getServiceUsageId, reading -> reading, (left, right) -> left));

        boolean missingIndexReading = billableUsages.stream().anyMatch(usage -> {
            RentalService service = rentalServiceRepository.findByIdAndMotelId(usage.getServiceId(), room.getMotelId()).orElse(null);
            return service != null && (
                service.getChargeType() == com.roomrental.modules.service.domain.model.ChargeType.PER_INDEX
                || service.getChargeType() == com.roomrental.modules.service.domain.model.ChargeType.METERED)
                    && !approvedReadings.containsKey(usage.getId());
        });

        if (missingIndexReading) {
            return null;
        }

        Invoice invoice = new Invoice();
        invoice.setTenantId(tenantId);
        invoice.setContractId(contract.getId());
        invoice.setRoomId(contract.getRoomId());
        invoice.setBillingMonth(billingMonth);
        invoice.setDueDate(LocalDate.now().plusDays(5)); // default 5 days
        invoice.setCreatedAt(OffsetDateTime.now());
        invoice.setUpdatedAt(OffsetDateTime.now());

        List<Map<String, Object>> snapshotItems = new ArrayList<>();
        
        // 1. Calculate Rent
        BillingStrategy rentStrategy = strategyFactory.getStrategy("FIXED", false);
        BillingContext rentContext = new BillingContext(
            null, "Tiền phòng", "FIXED", null, null, null, 1, contract.getRentPrice(), null
        );
        snapshotItems.add(buildSnapshotItem("FIXED", false, rentContext));
        List<InvoiceDetail> details = new ArrayList<>(rentStrategy.calculate(rentContext));

        // 2. Calculate services from real service usages
        for (ServiceUsage usage : billableUsages) {
            RentalService service = rentalServiceRepository.findByIdAndMotelId(usage.getServiceId(), room.getMotelId())
                    .orElseThrow(() -> BaseException.notFound("Service", usage.getServiceId()));
            LocalDate pricingDate = billingMonth.withDayOfMonth(billingMonth.lengthOfMonth());
            ServicePricing pricing = servicePricingRepository.findCurrentByServiceId(service.getId(), pricingDate).orElse(null);
            List<ServiceTierPricing> tiers = pricing != null ? pricing.getTierPrices() : List.of();
            boolean hasTiers = tiers != null && !tiers.isEmpty();

            MeterReading approvedReading = approvedReadings.get(usage.getId());
            BillingStrategy strategy = strategyFactory.getStrategy(service.getChargeType().name(), hasTiers);
            BillingContext context = buildBillingContext(service, usage, room, contract, pricing, tiers, approvedReading);
            snapshotItems.add(buildSnapshotItem(service.getChargeType().name(), hasTiers, context));
            details.addAll(strategy.calculate(context));
        }

        BigDecimal total = details.stream().map(InvoiceDetail::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setTotalAmount(total);
        
        // 3. Apply auto-pay from balance if any
        UUID residentId = contract.getPrimaryResidentUserId();
        com.roomrental.modules.finance.domain.model.ResidentBalance residentBalance = residentBalanceRepository.findById(residentId)
            .orElseGet(() -> {
                com.roomrental.modules.finance.domain.model.ResidentBalance rb = new com.roomrental.modules.finance.domain.model.ResidentBalance();
                rb.setResidentUserId(residentId);
                return rb;
            });
        BigDecimal creditBalance = residentBalance.getBalance() != null ? residentBalance.getBalance() : BigDecimal.ZERO;
        BigDecimal deduction = BigDecimal.ZERO;

        if (creditBalance.compareTo(BigDecimal.ZERO) > 0) {
            if (creditBalance.compareTo(total) >= 0) {
                deduction = total;
                residentBalance.deductBalance(total);
            } else {
                deduction = creditBalance;
                residentBalance.setBalance(BigDecimal.ZERO);
            }
            residentBalanceRepository.save(residentBalance);
        }

        invoice.setBalanceDeduction(deduction);
        invoice.setPaidAmount(BigDecimal.ZERO);
        if (invoice.getRemainingAmount().compareTo(BigDecimal.ZERO) <= 0) {
            invoice.setStatus(InvoiceStatus.PAID);
        }

        InvoiceGenerateCommand fakeCommand = new InvoiceGenerateCommand(room.getMotelId(), billingMonth);
        invoice.setCalculationSnapshot(buildCalculationSnapshot(fakeCommand, contract, room, snapshotItems));
        
        Invoice saved = invoiceRepository.save(invoice);
        
        for (InvoiceDetail d : details) {
            d.setInvoiceId(saved.getId());
        }
        invoiceDetailRepository.saveAll(details);

        List<ServiceUsage> toCancel = billableUsages.stream()
                .filter(usage -> usage.getStatus() == ServiceUsage.ServiceUsageStatus.PENDING_CANCELLATION)
                .peek(usage -> usage.setStatus(ServiceUsage.ServiceUsageStatus.CANCELLED))
                .peek(usage -> usage.setUpdatedAt(OffsetDateTime.now()))
                .collect(Collectors.toList());
        if (!toCancel.isEmpty()) {
            serviceUsageRepository.saveAll(toCancel);
        }
        
        UUID actorId = null;
        String actorRole = null;
        try {
            actorId = SecurityUtils.getCurrentUserId();
            actorRole = SecurityUtils.getCurrentRole();
        } catch (Exception ignored) {}

        eventPublisher.publishEvent(new InvoiceCreatedEvent(
            tenantId, actorId, actorRole,
            saved.getId(), saved.getTotalAmount().toPlainString()
        ));
        
        return toResult(saved);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResult> list(String status, Pageable pageable) {
        UUID tenantId = SecurityUtils.requireTenantId();
        if (status != null && !status.isEmpty()) {
            return invoiceRepository.findByTenantIdAndStatus(tenantId, status, pageable).map(this::toResult);
        }
        return invoiceRepository.findByTenantId(tenantId, pageable).map(this::toResult);
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResult> listMyInvoices(String status, Pageable pageable) {
        UUID tenantId = SecurityUtils.requireTenantId();
        UUID userId = SecurityUtils.getCurrentUserId();
        
        List<Long> contractIds = contractRepository.findByTenantId(tenantId).stream()
            .filter(c -> c.getPrimaryResidentUserId() != null && c.getPrimaryResidentUserId().equals(userId))
            .map(Contract::getId)
            .collect(Collectors.toList());
            
        if (contractIds.isEmpty()) {
            return Page.empty(pageable);
        }
        
        if (status != null && !status.isEmpty()) {
            return invoiceRepository.findByTenantIdAndContractIdInAndStatus(tenantId, contractIds, status, pageable).map(this::toResult);
        }
        return invoiceRepository.findByTenantIdAndContractIdIn(tenantId, contractIds, pageable).map(this::toResult);
    }

    @Transactional(readOnly = true)
    public InvoiceResult getDetail(Long id) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", id));
        List<InvoiceDetail> details = invoiceDetailRepository.findByInvoiceId(id);
        invoice.setDetails(details);
        return toResult(invoice);
    }

    @Transactional(rollbackFor = Exception.class)
    public InvoiceResult adjustInvoice(InvoiceAdjustCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(command.invoiceId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", command.invoiceId()));

        if (!invoice.canBeVoided()) {
            throw BaseException.badRequest("Only PENDING invoice can be adjusted");
        }

        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setCancelReason(command.reason());
        invoice.setUpdatedAt(OffsetDateTime.now());
        invoiceRepository.save(invoice);

        eventPublisher.publishEvent(new InvoiceCancelledEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
            invoice.getId(), command.reason()
        ));

        // Re-generate logic would go here. For now returning the voided one.
        return toResult(invoice);
    }

    @Transactional(rollbackFor = Exception.class)
    public void deleteInvoice(Long id) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", id));

        if (!invoice.canBeDeleted()) {
            throw BaseException.badRequest("Cannot delete invoice with transactions");
        }

        invoiceRepository.softDelete(id);
        
        eventPublisher.publishEvent(new InvoiceDeletedEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(), id
        ));
    }

    private InvoiceResult toResult(Invoice invoice) {
        BigDecimal creditBalanceSnapshot = BigDecimal.ZERO;
        if (invoice.getContractId() != null) {
            contractRepository.findById(invoice.getContractId()).ifPresent(contract -> {
                com.roomrental.modules.finance.domain.model.ResidentBalance rb = residentBalanceRepository.findById(contract.getPrimaryResidentUserId()).orElse(null);
                if (rb != null && rb.getBalance() != null) {
                    // Update this snapshot to what rb says
                }
            });
        }
        creditBalanceSnapshot = contractRepository.findById(invoice.getContractId())
                .flatMap(c -> residentBalanceRepository.findById(c.getPrimaryResidentUserId()))
                .map(rb -> rb.getBalance())
                .orElse(BigDecimal.ZERO);

        String roomNumber = null;
        if (invoice.getRoomId() != null) {
            roomNumber = roomRepository.findById(invoice.getRoomId())
                    .map(Room::getRoomNumber)
                    .orElse(null);
        }

        return new InvoiceResult(
            invoice.getId(),
            invoice.getContractId(),
            invoice.getRoomId(),
            roomNumber,
            invoice.getBillingMonth(),
            invoice.getTotalAmount(),
            invoice.getPaidAmount(),
            invoice.getBalanceDeduction(),
            invoice.getRemainingAmount(),
            BigDecimal.ZERO, // overpaidAmount is typically mapped via transaction, but we provide ZERO here as a fallback placeholder.
            creditBalanceSnapshot,
            invoice.getCalculationSnapshot(),
            invoice.getStatus().name(),
            invoice.getInvoiceType().name(),
            invoice.getCancelReason(),
            invoice.getDueDate(),
            invoice.getCreatedAt()
        );
    }

    private BillingContext buildBillingContext(
            RentalService service,
            ServiceUsage usage,
            Room room,
            Contract contract,
            ServicePricing pricing,
            List<ServiceTierPricing> tiers,
            MeterReading approvedReading) {
        BigDecimal basePrice = pricing != null ? pricing.getBasePrice() : BigDecimal.ZERO;
        Integer activeResidents = room.getCurrentResidentsCount() != null ? room.getCurrentResidentsCount() : 1;
        BigDecimal quantity = usage.getRegisteredQuantity() != null ? BigDecimal.valueOf(usage.getRegisteredQuantity()) : BigDecimal.ONE;
        BigDecimal oldReading = approvedReading != null ? approvedReading.getOldReading() : BigDecimal.ZERO;
        BigDecimal newReading = approvedReading != null ? approvedReading.getNewReading() : oldReading;
        BigDecimal consumption = approvedReading != null ? approvedReading.getConsumption() : null;
        if (consumption == null && approvedReading != null) {
            consumption = newReading.subtract(oldReading);
        }
        boolean meterBasedWithoutTiers = service.getChargeType() == com.roomrental.modules.service.domain.model.ChargeType.METERED
                || (service.getChargeType() == com.roomrental.modules.service.domain.model.ChargeType.PER_INDEX && (tiers == null || tiers.isEmpty()));

        if (service.getChargeType() == com.roomrental.modules.service.domain.model.ChargeType.PER_QUANTITY && approvedReading != null) {
            if (consumption == null) {
                consumption = newReading.subtract(oldReading);
            }
            if (consumption != null) {
                quantity = consumption.max(BigDecimal.ZERO);
            }
        } else if (meterBasedWithoutTiers && consumption != null) {
            quantity = consumption.max(BigDecimal.ZERO);
        }

        List<BillingContext.PricingTier> billingTiers = tiers == null ? List.of() : tiers.stream()
                .map(tier -> new BillingContext.PricingTier(tier.getTierStart(), tier.getTierEnd(), tier.getPricePerUnit()))
                .toList();

        return new BillingContext(
                service.getId(),
                service.getName(),
                service.getChargeType().name(),
                oldReading,
                newReading,
                quantity,
                activeResidents,
                basePrice,
                billingTiers
        );
    }

    private Map<String, Object> buildSnapshotItem(String strategyCode, boolean hasTiers, BillingContext context) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("strategyCode", strategyCode);
        item.put("hasTiers", hasTiers);
        item.put("serviceId", context.serviceId());
        item.put("serviceName", context.serviceName());
        item.put("chargeType", context.chargeType());
        item.put("oldReading", context.oldReading());
        item.put("newReading", context.newReading());
        item.put("quantity", context.quantity());
        item.put("activeResidents", context.activeResidents());
        item.put("basePrice", context.basePrice());
        item.put("pricingTiers", context.pricingTiers());
        return item;
    }

    private String buildCalculationSnapshot(
            InvoiceGenerateCommand command,
            Contract contract,
            Room room,
            List<Map<String, Object>> items) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("motelId", room.getMotelId());
        snapshot.put("roomId", room.getId());
        snapshot.put("contractId", contract.getId());
        snapshot.put("billingMonth", command.billingMonth());
        snapshot.put("items", items);
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize invoice calculation snapshot", ex);
        }
    }
}

