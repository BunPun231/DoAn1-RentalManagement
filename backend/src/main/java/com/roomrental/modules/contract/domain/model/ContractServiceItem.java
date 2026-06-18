package com.roomrental.modules.contract.domain.model;

import java.util.UUID;

/**
 * Domain model for services attached to a contract.
 */
public class ContractServiceItem {
    private UUID tenantId;
    private Long contractId;
    private Long serviceId;
    private Integer quantity;

    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public Long getContractId() {
        return contractId;
    }

    public void setContractId(Long contractId) {
        this.contractId = contractId;
    }

    public Long getServiceId() {
        return serviceId;
    }

    public void setServiceId(Long serviceId) {
        this.serviceId = serviceId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
