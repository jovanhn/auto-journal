package com.subtech.autojournal.model;

import com.subsoft.autojournal.model.VehicleRequest;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Entity(name = "Vehicle")
@Getter
@Setter
@Table(name = "vehicle")
@AllArgsConstructor
@Builder
@RequiredArgsConstructor
public class Vehicle {

    @Id
    @GenericGenerator(name="uuid", strategy = "uuid2")
    @GeneratedValue(generator = "uuid")
    private String id;

    private String type;

    private String brand;

    private String model;

    @Column(name = "build_year")
    private Integer year;

    private String serial;

    private String ownerId;

}
