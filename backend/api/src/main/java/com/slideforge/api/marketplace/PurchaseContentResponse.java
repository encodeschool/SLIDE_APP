package com.slideforge.api.marketplace;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;

public record PurchaseContentResponse(UUID entitlementId, String title, JsonNode document) {
}
