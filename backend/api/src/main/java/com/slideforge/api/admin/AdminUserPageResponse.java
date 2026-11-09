package com.slideforge.api.admin;

import java.util.List;

public record AdminUserPageResponse(List<AdminUserResponse> items, int page, int size, long total) {
}
