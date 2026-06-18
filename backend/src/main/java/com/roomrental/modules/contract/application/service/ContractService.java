package com.roomrental.modules.contract.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.contract.application.dto.ContractAppendixResult;
import com.roomrental.modules.contract.application.dto.ContractCreateCommand;
import com.roomrental.modules.contract.application.dto.ContractDetailResult;
import com.roomrental.modules.contract.application.dto.ContractResult;
import com.roomrental.modules.contract.application.dto.ContractServiceItemCommand;
import com.roomrental.modules.contract.application.dto.ContractServiceItemResult;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.model.ContractAppendix;
import com.roomrental.modules.contract.domain.model.ContractResident;
import com.roomrental.modules.contract.domain.model.ContractServiceItem;
import com.roomrental.modules.contract.domain.repository.ContractAppendixRepository;
import com.roomrental.modules.contract.domain.repository.ContractResidentRepository;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import com.roomrental.modules.contract.domain.repository.ContractServiceItemRepository;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import com.roomrental.modules.resident.application.dto.ResidentCreateCommand;
import com.roomrental.modules.resident.application.service.ResidentService;
import com.roomrental.modules.room.domain.model.Room;
import com.roomrental.modules.room.domain.model.RoomStatus;
import com.roomrental.modules.room.domain.repository.RoomRepository;
import com.roomrental.modules.service.domain.model.ChargeType;
import com.roomrental.modules.service.domain.model.RentalService;
import com.roomrental.modules.service.domain.repository.RentalServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Application Service cho Contract Management.
 * Xử lý các use case liên quan đến hợp đồng.
 */
@Service
public class ContractService {
    private final ContractRepository contractRepository;
    private final ContractResidentRepository contractResidentRepository;
    private final ContractAppendixRepository contractAppendixRepository;
    private final ContractServiceItemRepository contractServiceItemRepository;
    private final RoomRepository roomRepository;
    private final MotelRepository motelRepository;
    private final ResidentService residentService;
    private final RentalServiceRepository rentalServiceRepository;

    public ContractService(
            ContractRepository contractRepository,
            ContractResidentRepository contractResidentRepository,
            ContractAppendixRepository contractAppendixRepository,
            ContractServiceItemRepository contractServiceItemRepository,
            RoomRepository roomRepository,
            MotelRepository motelRepository,
            ResidentService residentService,
            RentalServiceRepository rentalServiceRepository
    ) {
        this.contractRepository = contractRepository;
        this.contractResidentRepository = contractResidentRepository;
        this.contractAppendixRepository = contractAppendixRepository;
        this.contractServiceItemRepository = contractServiceItemRepository;
        this.roomRepository = roomRepository;
        this.motelRepository = motelRepository;
        this.residentService = residentService;
        this.rentalServiceRepository = rentalServiceRepository;
    }

    @Transactional
    public ContractResult create(ContractCreateCommand command) {
        UUID tenantId = requireTenantId();
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        
        // Validate input
        if (command.roomId() == null || command.roomId() <= 0) {
            throw BaseException.badRequest("roomId: must be valid");
        }
        if ((command.primaryResidentUserId() == null || command.primaryResidentUserId().isBlank())
                && (command.primaryResidentPhone() == null || command.primaryResidentPhone().isBlank())) {
            throw BaseException.badRequest("primaryResidentUserId or primaryResidentPhone: required");
        }
        if (command.rentPrice() == null || command.rentPrice().compareTo(BigDecimal.ZERO) <= 0) {
            throw BaseException.badRequest("rentPrice: must be positive");
        }
        if (command.startDate() == null || command.endDate() == null) {
            throw BaseException.badRequest("startDate and endDate: required");
        }
        if (!command.endDate().isAfter(command.startDate())) {
            throw BaseException.badRequest("endDate: must be after startDate");
        }
        if (command.depositAmount() == null || command.depositAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw BaseException.badRequest("depositAmount: must be positive");
        }
        Contract.BillingCycle billingCycle = parseBillingCycle(command.billingCycle());

        Room room = roomRepository.findById(command.roomId())
                .orElseThrow(() -> BaseException.notFound("Room", command.roomId()));
        Long motelId = room.getMotelId();
        motelRepository.findByIdAndTenantId(motelId, tenantId)
            .orElseThrow(() -> BaseException.notFound("Motel", motelId));

        if (room.getStatus() != RoomStatus.EMPTY && room.getStatus() != RoomStatus.DEPOSITED) {
            throw BaseException.conflict("Room must be EMPTY or DEPOSITED to create contract");
        }
        if (contractRepository.existsActiveByRoomId(tenantId, room.getId())) {
            throw BaseException.conflict("Room already has an active contract");
        }

        UUID primaryResidentId = resolvePrimaryResident(tenantId, command);

        Contract.DepositStatus depositStatus = parseDepositStatus(command.depositStatus());
        boolean depositPaid = depositStatus == Contract.DepositStatus.PAID;

        Contract contract = new Contract();
        contract.setTenantId(tenantId);
        contract.setRoomId(command.roomId());
        contract.setPrimaryResidentUserId(primaryResidentId);
        contract.setRentPrice(command.rentPrice());
        contract.setStartDate(command.startDate());
        contract.setEndDate(command.endDate());
        contract.setDepositAmount(command.depositAmount());
        contract.setDepositStatus(depositStatus);
        contract.setStatus(depositPaid ? Contract.ContractStatus.ACTIVE : Contract.ContractStatus.DRAFT);
        contract.setBillingCycle(billingCycle);
        contract.setCreatedAt(LocalDateTime.now());
        contract.setCreatedBy(currentUserId);

        Contract saved = contractRepository.save(contract);

        List<ContractResident> residents = buildResidents(saved.getId(), tenantId, primaryResidentId, command.residentUserIds());
        if (!residents.isEmpty()) {
            contractResidentRepository.saveAll(residents);
        }

        List<ContractServiceItem> serviceItems = buildServiceItems(saved.getId(), tenantId, motelId, command.serviceItems());
        if (!serviceItems.isEmpty()) {
            contractServiceItemRepository.saveAll(serviceItems);
        }

        room.setStatus(depositPaid ? RoomStatus.RENTED : RoomStatus.DEPOSITED);
        room.setCurrentResidentsCount(residents.isEmpty() ? 1 : residents.size());
        roomRepository.save(room);

        return toResult(saved);
    }

    @Transactional
    public ContractResult activate(Long id) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", id));

        if (!contract.getStatus().equals(Contract.ContractStatus.DRAFT)) {
            throw BaseException.badRequest("Only DRAFT contracts can be activated");
        }
        if (contract.getDepositStatus() != Contract.DepositStatus.PAID) {
            throw BaseException.badRequest("Deposit must be PAID before activation");
        }

        contract.activate();
        contract.setUpdatedAt(LocalDateTime.now());
        Contract saved = contractRepository.save(contract);

        Room room = roomRepository.findById(contract.getRoomId())
            .orElseThrow(() -> BaseException.notFound("Room", contract.getRoomId()));
        int residentsCount = contractResidentRepository.findByContractId(contract.getId()).size();
        room.setStatus(RoomStatus.RENTED);
        room.setCurrentResidentsCount(residentsCount > 0 ? residentsCount : 1);
        roomRepository.save(room);

        return toResult(saved);
    }


    @Transactional(readOnly = true)
    public Page<ContractResult> listByMotel(Long motelId, Pageable pageable) {
        UUID tenantId = requireTenantId();
        return contractRepository.findByTenantIdAndMotelId(tenantId, motelId, pageable)
                .map(this::toResult);
    }

    @Transactional(readOnly = true)
    public Page<ContractResult> listByMotelAndStatus(Long motelId, String status, Pageable pageable) {
        UUID tenantId = requireTenantId();
        return contractRepository.findByTenantIdAndMotelIdAndStatus(tenantId, motelId, status, pageable)
                .map(this::toResult);
    }

    @Transactional(readOnly = true)
    public Page<ContractResult> listExpiringByMotel(Long motelId, LocalDate fromDate, LocalDate toDate, Pageable pageable) {
        UUID tenantId = requireTenantId();
        return contractRepository.findExpiringByTenantIdAndMotelId(tenantId, motelId, fromDate, toDate, pageable)
                .map(this::toResult);
    }

    @Transactional(readOnly = true)
    public ContractResult getById(Long id) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", id));
        return toResult(contract);
    }

        @Transactional(readOnly = true)
        public ContractDetailResult getDetail(Long id) {
            UUID tenantId = requireTenantId();
            Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                    .orElseThrow(() -> BaseException.notFound("Contract", id));

            List<String> residentIds = contractResidentRepository.findByContractId(id).stream()
                    .map(r -> r.getResidentUserId().toString())
                    .toList();
            List<ContractServiceItemResult> serviceItems = contractServiceItemRepository.findByContractId(id).stream()
                    .map(item -> new ContractServiceItemResult(item.getServiceId(), item.getQuantity()))
                    .toList();
            List<ContractAppendixResult> appendixes = contractAppendixRepository.findByContractId(id).stream()
                    .map(this::toAppendixResult)
                    .toList();

            return new ContractDetailResult(
                    contract.getId(),
                    contract.getTenantId().toString(),
                    contract.getRoomId(),
                    contract.getPrimaryResidentUserId().toString(),
                    contract.getRentPrice(),
                    contract.getStartDate(),
                    contract.getEndDate(),
                    contract.getDepositAmount(),
                    contract.getDepositStatus().toString(),
                    contract.getStatus().toString(),
                    contract.getBillingCycle().toString(),
                    contract.getIntendedMoveOutDate(),
                    contract.getPdfUrl(),
                    contract.getCreatedAt(),
                    contract.getUpdatedAt(),
                    residentIds,
                    serviceItems,
                    appendixes
            );
        }

        @Transactional(readOnly = true)
        public byte[] exportPdf(Long id) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", id));

        String text = "Contract " + contract.getId() + " | Room " + contract.getRoomId() +
            " | Start " + contract.getStartDate() + " | End " + contract.getEndDate();
        return buildSimplePdf(text);
        }

    @Transactional(readOnly = true)
    public List<ContractResult> listByTenant() {
        UUID tenantId = requireTenantId();
        return contractRepository.findByTenantId(tenantId).stream()
                .map(this::toResult)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContractResult> listActiveByTenant() {
        UUID tenantId = requireTenantId();
        return contractRepository.findActiveByTenantId(tenantId).stream()
                .map(this::toResult)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ContractResult> listByResident(String residentUserId) {
        UUID tenantId = requireTenantId();
        UUID residentId = UUID.fromString(residentUserId);
        return contractRepository.findByResidentUserId(tenantId, residentId).stream()
                .map(this::toResult)
                .toList();
    }

    // ========================
    // UC67: Cancel Contract (soft delete)
    // ========================

    @Transactional
    public ContractResult cancel(Long id, String reason) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", id));

        if (contract.getStatus() == Contract.ContractStatus.CANCELED) {
            throw BaseException.badRequest("Contract is already canceled");
        }
        if (contract.getStatus() == Contract.ContractStatus.LIQUIDATED) {
            throw BaseException.badRequest("Cannot cancel a liquidated contract");
        }

        contract.setStatus(Contract.ContractStatus.CANCELED);
        contract.setCancelReason(reason);
        contract.setUpdatedAt(LocalDateTime.now());

        Contract saved = contractRepository.save(contract);

        // Release room back to EMPTY or DEPOSITED
        Room room = roomRepository.findById(contract.getRoomId())
                .orElseThrow(() -> BaseException.notFound("Room", contract.getRoomId()));
        room.setStatus(RoomStatus.EMPTY);
        room.setCurrentResidentsCount(0);
        roomRepository.save(room);

        return toResult(saved);
    }

    // ========================
    // UC69: Deposit Management
    // ========================

    @Transactional
    public ContractResult collectDeposit(Long id) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", id));

        if (contract.getDepositStatus() != Contract.DepositStatus.UNPAID) {
            throw BaseException.badRequest("Deposit must be UNPAID to collect");
        }

        contract.setDepositStatus(Contract.DepositStatus.PAID);
        contract.setUpdatedAt(LocalDateTime.now());

        // If DRAFT, auto-activate to ACTIVE once deposit is collected
        if (contract.getStatus() == Contract.ContractStatus.DRAFT) {
            contract.setStatus(Contract.ContractStatus.ACTIVE);
        }

        Contract saved = contractRepository.save(contract);

        // Update room status if contract becomes active
        if (saved.getStatus() == Contract.ContractStatus.ACTIVE) {
            Room room = roomRepository.findById(contract.getRoomId())
                    .orElseThrow(() -> BaseException.notFound("Room", contract.getRoomId()));
            int residentsCount = contractResidentRepository.findByContractId(contract.getId()).size();
            room.setStatus(RoomStatus.RENTED);
            room.setCurrentResidentsCount(residentsCount > 0 ? residentsCount : 1);
            roomRepository.save(room);
        }

        return toResult(saved);
    }

    @Transactional
    public ContractResult refundDeposit(Long id) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", id));

        if (contract.getDepositStatus() != Contract.DepositStatus.PAID) {
            throw BaseException.badRequest("Deposit must be PAID to refund");
        }

        contract.setDepositStatus(Contract.DepositStatus.REFUNDED);
        contract.setUpdatedAt(LocalDateTime.now());
        Contract saved = contractRepository.save(contract);
        return toResult(saved);
    }

    @Transactional
    public ContractResult deductDeposit(Long id) {
        UUID tenantId = requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", id));

        if (contract.getDepositStatus() != Contract.DepositStatus.PAID) {
            throw BaseException.badRequest("Deposit must be PAID to deduct");
        }

        contract.setDepositStatus(Contract.DepositStatus.DEDUCTED);
        contract.setUpdatedAt(LocalDateTime.now());
        Contract saved = contractRepository.save(contract);
        return toResult(saved);
    }

    // Helper methods
    private UUID requireTenantId() {
        return SecurityUtils.requireTenantId();
    }

    private UUID resolvePrimaryResident(UUID tenantId, ContractCreateCommand command) {
        if (command.primaryResidentUserId() != null && !command.primaryResidentUserId().isBlank()) {
            UUID residentId = UUID.fromString(command.primaryResidentUserId());
            residentService.get(residentId);
            return residentId;
        }

        if (command.primaryResidentPhone() == null || command.primaryResidentPhone().isBlank()) {
            throw BaseException.badRequest("primaryResidentPhone: required");
        }
        if (command.primaryResidentFullName() == null || command.primaryResidentFullName().isBlank()) {
            throw BaseException.badRequest("primaryResidentFullName: required");
        }
        if (command.primaryResidentIdCardNumber() == null || command.primaryResidentIdCardNumber().isBlank()) {
            throw BaseException.badRequest("primaryResidentIdCardNumber: required");
        }

        return residentService.create(new ResidentCreateCommand(
                command.primaryResidentPhone(),
                command.primaryResidentEmail(),
                command.primaryResidentFullName(),
                command.primaryResidentIdCardNumber(),
                command.primaryResidentIdCardFrontUrl(),
                command.primaryResidentIdCardBackUrl()
        )).userId();
    }

    private List<ContractResident> buildResidents(Long contractId, UUID tenantId, UUID primaryResidentId, List<String> residentUserIds) {
        List<ContractResident> residents = new java.util.ArrayList<>();
        ContractResident primary = new ContractResident();
        primary.setContractId(contractId);
        primary.setTenantId(tenantId);
        primary.setResidentUserId(primaryResidentId);
        primary.setActive(true);
        primary.setJoinedAt(LocalDateTime.now());
        residents.add(primary);

        if (residentUserIds != null) {
            for (String id : residentUserIds) {
                if (id == null || id.isBlank()) {
                    continue;
                }
                UUID residentId = UUID.fromString(id);
                if (residentId.equals(primaryResidentId)) {
                    continue;
                }
                ContractResident resident = new ContractResident();
                resident.setContractId(contractId);
                resident.setTenantId(tenantId);
                resident.setResidentUserId(residentId);
                resident.setActive(true);
                resident.setJoinedAt(LocalDateTime.now());
                residents.add(resident);
            }
        }

        return residents;
    }

    private Contract.DepositStatus parseDepositStatus(String status) {
        if (status == null || status.isBlank()) {
            return Contract.DepositStatus.UNPAID;
        }
        try {
            return Contract.DepositStatus.valueOf(status);
        } catch (IllegalArgumentException ex) {
            throw BaseException.badRequest("depositStatus: invalid value");
        }
    }

    private Contract.BillingCycle parseBillingCycle(String cycle) {
        if (cycle == null || cycle.isBlank()) {
            throw BaseException.badRequest("billingCycle: required");
        }
        try {
            return Contract.BillingCycle.valueOf(cycle);
        } catch (IllegalArgumentException ex) {
            throw BaseException.badRequest("billingCycle: invalid value");
        }
    }

    private List<ContractServiceItem> buildServiceItems(
            Long contractId,
            UUID tenantId,
            Long motelId,
            List<ContractServiceItemCommand> serviceItems
    ) {
        if (serviceItems == null || serviceItems.isEmpty()) {
            return List.of();
        }

        List<ContractServiceItem> items = new java.util.ArrayList<>();
        for (ContractServiceItemCommand item : serviceItems) {
            if (item == null || item.serviceId() == null) {
                continue;
            }

            RentalService service = rentalServiceRepository.findByIdAndMotelId(item.serviceId(), motelId)
                    .orElseThrow(() -> BaseException.notFound("Service", item.serviceId()));

            Integer quantity = item.quantity();
            if (service.getChargeType() == ChargeType.PER_QUANTITY) {
                if (quantity == null || quantity < 1) {
                    throw BaseException.badRequest("quantity: required for PER_QUANTITY services");
                }
            }

            ContractServiceItem serviceItem = new ContractServiceItem();
            serviceItem.setTenantId(tenantId);
            serviceItem.setContractId(contractId);
            serviceItem.setServiceId(item.serviceId());
            serviceItem.setQuantity(quantity != null ? quantity : 1);
            items.add(serviceItem);
        }

        return items;
    }

    private ContractAppendixResult toAppendixResult(ContractAppendix appendix) {
        return new ContractAppendixResult(
                appendix.getId(),
                appendix.getContractId(),
                appendix.getEffectiveDate(),
                appendix.getNewRentPrice(),
                appendix.getAppendixType(),
                appendix.getMetadata(),
                appendix.getCreatedBy() != null ? appendix.getCreatedBy().toString() : null,
                appendix.getCreatedAt()
        );
    }

    private byte[] buildSimplePdf(String text) {
        String safeText = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
        String contentStream = "BT /F1 12 Tf 50 750 Td (" + safeText + ") Tj ET";
        byte[] contentBytes = contentStream.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1);

        String obj1 = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n";
        String obj2 = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n";
        String obj3 = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
                "/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n";
        String obj4 = "4 0 obj << /Length " + contentBytes.length + " >> stream\n" +
                contentStream + "\nendstream endobj\n";
        String obj5 = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n";

        StringBuilder sb = new StringBuilder();
        sb.append("%PDF-1.4\n");

        List<Integer> offsets = new java.util.ArrayList<>();
        offsets.add(sb.length());
        sb.append(obj1);
        offsets.add(sb.length());
        sb.append(obj2);
        offsets.add(sb.length());
        sb.append(obj3);
        offsets.add(sb.length());
        sb.append(obj4);
        offsets.add(sb.length());
        sb.append(obj5);

        int xrefOffset = sb.length();
        sb.append("xref\n0 6\n0000000000 65535 f \n");
        for (int offset : offsets) {
            sb.append(String.format("%010d 00000 n \n", offset));
        }
        sb.append("trailer << /Size 6 /Root 1 0 R >>\n");
        sb.append("startxref\n");
        sb.append(xrefOffset).append("\n%%EOF");

        return sb.toString().getBytes(java.nio.charset.StandardCharsets.ISO_8859_1);
    }

    private ContractResult toResult(Contract contract) {
        return new ContractResult(
                contract.getId(),
                contract.getTenantId().toString(),
                contract.getRoomId(),
                contract.getPrimaryResidentUserId().toString(),
                contract.getRentPrice(),
                contract.getStartDate(),
                contract.getEndDate(),
                contract.getDepositAmount(),
                contract.getDepositStatus().toString(),
                contract.getStatus().toString(),
                contract.getBillingCycle().toString(),
                contract.getIntendedMoveOutDate(),
                contract.getPdfUrl(),
                contract.getCreatedAt(),
                contract.getUpdatedAt()
        );
    }
}
