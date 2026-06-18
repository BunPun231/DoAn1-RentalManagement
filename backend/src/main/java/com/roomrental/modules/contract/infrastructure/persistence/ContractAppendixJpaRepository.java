package com.roomrental.modules.contract.infrastructure.persistence;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractAppendixJpaRepository extends JpaRepository<ContractAppendixEntity, Long> {
    List<ContractAppendixEntity> findByContractId(Long contractId);
}
