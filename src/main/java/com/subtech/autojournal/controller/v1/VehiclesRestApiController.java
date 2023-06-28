package com.subtech.autojournal.controller.v1;

import com.subsoft.autojournal.api.UsersApiController;
import com.subsoft.autojournal.api.UsersApiDelegate;
import com.subsoft.autojournal.api.VehiclesApiController;
import com.subsoft.autojournal.api.VehiclesApiDelegate;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class VehiclesRestApiController extends VehiclesApiController {

    public VehiclesRestApiController(VehiclesApiDelegate delegate) {
        super(delegate);
    }
}
