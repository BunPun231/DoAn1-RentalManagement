package com.roomrental.modules.contract.application.adjustment;

import com.roomrental.modules.contract.application.dto.ContractAdjustmentRequest;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentType;
import com.roomrental.modules.contract.domain.model.Contract;

public interface ContractAdjustmentStrategy {
    ContractAdjustmentType getType();

    void process(Contract contract, ContractAdjustmentRequest request);
}
