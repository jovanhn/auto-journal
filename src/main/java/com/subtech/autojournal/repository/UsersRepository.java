package com.subtech.autojournal.repository;

import com.subtech.autojournal.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UsersRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String user);
}
