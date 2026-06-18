package com.roomrental.modules.contract.application.adjustment;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentRequest;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentType;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.model.ContractAppendix;
import com.roomrental.modules.contract.domain.repository.ContractAppendixRepository;
import com.roomrental.modules.invoice.domain.repository.InvoiceReadRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class PriceChangeStrategy implements ContractAdjustmentStrategy {
    private final ContractAppendixRepository appendixRepository;
    private final InvoiceReadRepository invoiceReadRepository;

    public PriceChangeStrategy(
            ContractAppendixRepository appendixRepository,
            InvoiceReadRepository invoiceReadRepository
    ) {
        this.appendixRepository = appendixRepository;
        this.invoiceReadRepository = invoiceReadRepository;
    }

    @Override
    public ContractAdjustmentType getType() {
        return ContractAdjustmentType.PRICE_CHANGE;
    }

    @Override
    public Long process(Contract contract, ContractAdjustmentRequest request) {
        LocalDate effectiveDate = request.effectiveDate();
        if (effectiveDate == null) {
            throw BaseException.badRequest("effectiveDate: required");
        }
        BigDecimal newRentPrice = request.newRentPrice();
        if (newRentPrice == null || newRentPrice.compareTo(BigDecimal.ZERO) <= 0) {
            throw BaseException.badRequest("newRentPrice: must be positive");
        }

        if (invoiceReadRepository.existsPaidInvoiceCovering(contract.getId(), effectiveDate)) {
            throw BaseException.badRequest("effectiveDate: overlaps a paid invoice period");
        }

        UUID actorId = SecurityUtils.getCurrentUserId();
        ContractAppendix appendix = new ContractAppendix();
        appendix.setTenantId(contract.getTenantId());
        appendix.setContractId(contract.getId());
        appendix.setEffectiveDate(effectiveDate);
        appendix.setNewRentPrice(newRentPrice);
        appendix.setAppendixType(getType().name());
        appendix.setMetadata(null);
        appendix.setCreatedBy(actorId);
        appendix.setCreatedAt(LocalDateTime.now());
        ContractAppendix saved = appendixRepository.save(appendix);
        return saved.getId();
    }
}
