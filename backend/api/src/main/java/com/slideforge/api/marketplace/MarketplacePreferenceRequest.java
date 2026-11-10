package com.slideforge.api.marketplace;

import jakarta.validation.constraints.Size;

public record MarketplacePreferenceRequest(@Size(max = 40) String preferredCategory) {
}
