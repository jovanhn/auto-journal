package com.subtech.autojournal.repository;

import com.subtech.autojournal.model.User;
import com.subtech.autojournal.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {

    List<Vehicle> findByUserId(String userId);
}
