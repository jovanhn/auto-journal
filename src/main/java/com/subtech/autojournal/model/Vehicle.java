package com.subtech.autojournal.model;

import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;

@Entity(name = "Vehicle")
@Getter
@Setter
@Table(name = "vehicles")
@AllArgsConstructor
@Builder
@RequiredArgsConstructor
public class Vehicle {

    @Id
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    @GeneratedValue(generator = "uuid")
    private String id;

    private String type;

    private String brand;

    private String model;

    @Column(name = "build_year")
    private Integer year;

    private String serial;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

}
