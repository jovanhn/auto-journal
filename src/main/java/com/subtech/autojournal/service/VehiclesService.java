package com.subtech.autojournal.service;

import com.subtech.autojournal.model.Vehicle;
import com.subtech.autojournal.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class VehiclesService {

    private final VehicleRepository vehicleRepository;

    public VehiclesService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }


    public Vehicle createVehicle(Vehicle vehicle) {
        return vehicleRepository.save(vehicle);
    }

    public Vehicle getVehicle(String vehicleId) {
        Optional<Vehicle> vehicle = vehicleRepository.findById(vehicleId);
        if (vehicle.isEmpty()) {
            throw new IllegalStateException("Vehicle does not exist");
        }
        return vehicle.get();
    }


}
