package com.slideforge.api.marketplace;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/marketplace/categories")
public class AdminMarketplaceCategoryController {
    private final MarketplaceService marketplaceService;

    public AdminMarketplaceCategoryController(MarketplaceService marketplaceService) {
        this.marketplaceService = marketplaceService;
    }

    @GetMapping
    public List<AdminMarketplaceCategoryResponse> list() {
        return marketplaceService.adminCategories();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminMarketplaceCategoryResponse create(
            @Valid @RequestBody CreateMarketplaceCategoryRequest request) {
        return marketplaceService.createCategory(request);
    }

    @PatchMapping("/{slug}/status")
    public AdminMarketplaceCategoryResponse updateStatus(
            @PathVariable String slug,
            @Valid @RequestBody UpdateMarketplaceCategoryStatusRequest request) {
        return marketplaceService.updateCategoryStatus(slug, request.active());
    }
}
