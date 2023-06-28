package com.subtech.autojournal.controller.v1;

import com.subsoft.autojournal.api.UsersApiDelegate;
import com.subsoft.autojournal.model.UserRequest;
import com.subsoft.autojournal.model.UserResponse;
import com.subtech.autojournal.model.User;
import com.subtech.autojournal.service.UsersService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class UsersRestApiDelegate implements UsersApiDelegate {

    private UsersService usersService;

    public UsersRestApiDelegate(UsersService usersService) {
        this.usersService = usersService;
    }


    @Override
    public ResponseEntity<UserResponse> getUserByQueryParam(String username, String email) {
        // TODO: Currently only working for email
        User user = usersService.getUserByUserName(username);
        if (user != null) {
            return ResponseEntity.status(200).body(
                    new UserResponse()
                            .name(user.getUsername())
                            .email(user.getEmail())
                            .id(user.getId())
            );
        }
        return ResponseEntity.status(404).body(null);
    }

    @Override
    public ResponseEntity<UserResponse> createUser(UserRequest userRequest) {
        User user = usersService.createUser(
                User.builder()
                        .username(userRequest.getName())
                        .email(userRequest.getEmail())
                        .build());

        return ResponseEntity.status(201).body(
                new UserResponse()
                        .id(user.getId())
                        .name(user.getUsername())
                        .email(user.getEmail()));
    }

    @Override
    public ResponseEntity<Void> updateUser(String username, UserRequest userRequest) {
        // TODO: extend with username update if needed
        usersService.updateUser(username, User.builder().email(userRequest.getEmail()).build());
        return ResponseEntity.status(200).body(null);
    }

    @Override
    public ResponseEntity<Void> deleteUser(String username) {
        usersService.deleteUser(username);
        return ResponseEntity.status(200).body(null);
    }

    @Override
    public ResponseEntity<UserResponse> getUserById(String userId) {
        User user = usersService.getUserById(userId);
        return ResponseEntity.status(200).body(new UserResponse().id(user.getId()).name(user.getUsername()).email(user.getEmail()));
    }
}
