package com.subtech.autojournal.model;

import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.util.Set;

@Entity(name = "User")
@Getter
@Setter
@Table(name = "users")
@AllArgsConstructor
@Builder
@RequiredArgsConstructor
public class User {

    @Id
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    @GeneratedValue(generator = "uuid")
    private String id;

    @Column(unique = true)
    private String username;

    private String email;

    // Mapped by needs to be the name of the Entity lowercase
    @OneToMany(
            mappedBy = "user",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private Set<Vehicle> vehicles;
}


