package com.subtech.autojournal.model;

import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;
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
    @GenericGenerator(name="uuid", strategy = "uuid2")
    @GeneratedValue(generator = "uuid")
    private String id;

    @Column(unique = true)
    private String username;

    private String email;

}


