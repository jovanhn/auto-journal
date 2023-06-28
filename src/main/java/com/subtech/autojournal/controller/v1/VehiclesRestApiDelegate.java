package com.subtech.autojournal.controller.v1;

import com.subsoft.autojournal.api.VehiclesApiDelegate;
import com.subsoft.autojournal.model.VehicleRequest;
import com.subsoft.autojournal.model.VehicleResponse;
import com.subtech.autojournal.model.Vehicle;
import com.subtech.autojournal.service.VehiclesService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class VehiclesRestApiDelegate implements VehiclesApiDelegate {

    private VehiclesService vehiclesService;

    public VehiclesRestApiDelegate(VehiclesService vehiclesService) {
        this.vehiclesService = vehiclesService;
    }

    @Override
    public ResponseEntity<VehicleResponse> createVehicle(VehicleRequest vehicleRequest) {
        Vehicle vehicle = vehiclesService.createVehicle(Vehicle.builder()
                .type(vehicleRequest.getType())
                .brand(vehicleRequest.getBrand())
                .model(vehicleRequest.getModel())
                .year(vehicleRequest.getYear())
                .ownerId(vehicleRequest.getOwnerId())
                .serial(vehicleRequest.getSerial()).build());
        return ResponseEntity.status(201).body(
                new VehicleResponse()
                        .id(vehicle.getId())
                        .brand(vehicle.getBrand())
                        .model(vehicle.getModel())
                        .year(vehicle.getYear())
                        .type(vehicle.getType())
                        .serial(vehicle.getSerial())
                        .ownerId(vehicle.getOwnerId())
        );
    }


    @Override
    public ResponseEntity<VehicleResponse> getVehicle(String vehicleId) {
        Vehicle vehicle = vehiclesService.getVehicle(vehicleId);
        return ResponseEntity.status(200).body(
                mapVehicleToVehicleResponse(vehicle));
    }

    public static VehicleResponse mapVehicleToVehicleResponse(Vehicle vehicle) {
        return new VehicleResponse()
                .id(vehicle.getId())
                .brand(vehicle.getBrand())
                .model(vehicle.getModel())
                .year(vehicle.getYear())
                .type(vehicle.getType())
                .serial(vehicle.getSerial())
                .ownerId(vehicle.getOwnerId());
    }
}
