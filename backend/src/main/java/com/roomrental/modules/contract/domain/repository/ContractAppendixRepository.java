package com.roomrental.modules.contract.domain.repository;

import com.roomrental.modules.contract.domain.model.ContractAppendix;
import java.util.List;

/**
 * Port interface for contract appendix persistence.
 */
public interface ContractAppendixRepository {
    ContractAppendix save(ContractAppendix appendix);

    List<ContractAppendix> findByContractId(Long contractId);
}
