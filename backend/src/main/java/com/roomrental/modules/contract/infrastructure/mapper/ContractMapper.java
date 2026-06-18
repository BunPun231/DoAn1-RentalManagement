package com.roomrental.modules.contract.infrastructure.mapper;

import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.infrastructure.persistence.ContractEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct Mapper cho Contract ↔ ContractEntity.
 */
@Mapper(componentModel = "spring")
public interface ContractMapper {
    Contract toDomain(ContractEntity entity);

    @Mapping(target = "cancelReason", source = "cancelReason")
    ContractEntity toEntity(Contract domain);

    default String map(Contract.BillingCycle billingCycle) {
        return billingCycle != null ? billingCycle.name() : null;
    }

    default Contract.BillingCycle map(String billingCycle) {
        return billingCycle != null ? Contract.BillingCycle.valueOf(billingCycle) : null;
    }
}
