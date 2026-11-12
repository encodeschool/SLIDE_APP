package com.slideforge.api.users.repository;

import com.slideforge.api.users.model.UserAccount;
import java.util.Optional;
import java.util.UUID;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<UserAccount, UUID>, JpaSpecificationExecutor<UserAccount> {
    Optional<UserAccount> findByEmail(String email);

    @Query(value = "select users.* from users where exists "
            + "(select 1 from user_roles where user_roles.user_id = users.id and user_roles.role = :role) "
            + "order by users.id for update", nativeQuery = true)
    List<UserAccount> lockAccountsWithRole(@Param("role") String role);
}