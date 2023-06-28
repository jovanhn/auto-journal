package com.subtech.autojournal.controller.v1;

import com.subsoft.autojournal.api.UsersApiController;
import com.subsoft.autojournal.api.UsersApiDelegate;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UsersRestApiController extends UsersApiController {

//    public UsersRestApiController(UsersApiDelegate delegate) {
//        super(delegate);
//    }

    public UsersRestApiController(UsersApiDelegate delegate) {
        super(delegate);
    }
}
