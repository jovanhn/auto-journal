package com.subtech.autojournal;

import com.subsoft.autojournal.api.UsersApiController;
import com.subsoft.autojournal.api.UsersApiDelegate;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UsersRestApiController extends UsersApiController {

    public UsersRestApiController(UsersApiDelegate delegate) {
        super(delegate);
    }
}
