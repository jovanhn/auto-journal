package com.subtech.autojournal.model;

import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.util.Date;

@Entity(name = "Event")
@Getter
@Setter
@Table(name = "events")
@AllArgsConstructor
@Builder
@RequiredArgsConstructor
public class Event {

    @Id
    @GenericGenerator(name = "uuid", strategy = "uuid2")
    @GeneratedValue(generator = "uuid")
    private String id;

    private String type;

    private String title;

    private String description;

    private Double price;

    private String currency;

    @Temporal(TemporalType.DATE)
    private Date createdOn;

    @Temporal(TemporalType.DATE)
    private Date loggedFor;

    @Temporal(TemporalType.DATE)
    private Date deletedOn;

    private String deleteReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;
}
