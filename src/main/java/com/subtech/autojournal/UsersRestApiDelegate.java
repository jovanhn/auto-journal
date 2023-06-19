package com.subtech.autojournal;

import com.subsoft.autojournal.api.UsersApiDelegate;
import com.subsoft.autojournal.model.User;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class UsersRestApiDelegate implements UsersApiDelegate {

    @Override
    public ResponseEntity<User> getUserByName(String username) {
        System.out.println("Getting user: " + username);
        return UsersApiDelegate.super.getUserByName(username);
    }
}
