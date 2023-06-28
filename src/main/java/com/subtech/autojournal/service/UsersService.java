package com.subtech.autojournal.service;

import com.subtech.autojournal.model.User;
import com.subtech.autojournal.repository.UsersRepository;
import org.springframework.stereotype.Service;

import javax.transaction.Transactional;
import java.util.Optional;

@Service
public class UsersService {

    private final UsersRepository usersRepository;


    public UsersService(UsersRepository usersRepository) {
        this.usersRepository = usersRepository;
    }

    public User getUserByUserName(String username) {
        Optional<User> optionalUser = usersRepository.findByUsername(username);
        return optionalUser.orElse(null);
    }

    @Transactional
    public User createUser(User newUser) {
        if (usersRepository.existsByUsername(newUser.getUsername())) {
            throw new IllegalStateException("User with this username already exists!");
        }
        return usersRepository.save(newUser);
    }

    @Transactional
    public void updateUser(String userId, User updatedUser) {
        Optional<User> user = usersRepository.findById(userId);
        if (user.isEmpty()) {
            throw new IllegalStateException("User with this username already exists!");
        }
        user.get().setEmail(updatedUser.getEmail());

    }

    public void deleteUser(String userId) {
        Optional<User> user = usersRepository.findById(userId);
        if (user.isEmpty()) {
            throw new IllegalStateException("User with this username does no exists!");
        }
        usersRepository.delete(user.get());
    }

    public User getUserById(String userId) {

        Optional<User> user = usersRepository.findById(userId);
        if (user.isEmpty()) {
            throw new IllegalStateException("User with " + userId + " does not exist");
        }
        return user.get();
    }
}
