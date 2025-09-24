const express = require("express");
const router = express.Router();
const fetch = require('node-fetch');

const RESTAURANT_ADDRESS = "10 Piccadilly, London W1J 0DB";
const RESTAURANT_COORDINATES = [-0.1386, 51.5101]; // [longitude, latitude]

const POSTCODE_ZONES = {
  SW: { cost: 4, time: 15 },
  E:  { cost: 6, time: 25 },
  W:  { cost: 6, time: 25 },
  N:  { cost: 6, time: 25 },
  NW: { cost: 7, time: 30 },
  SE: { cost: 7, time: 30 },
  DEFAULT: { cost: 9, time: 45 }
};

const MAX_DELIVERY_DISTANCE_KM = 5;
const COOKING_TIME_MINUTES = 20;


// Calculate straight-line distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  console.log("Calculating distance between:", [lat1, lon1], "and", [lat2, lon2]);
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distanceKm = R * c;
  
  console.log("Calculated distance:", distanceKm, "km");
  return distanceKm;
}
// Extract postcode from address
function extractPostcode(address) {
  const postcodeMatch = address.match(/[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i);
  return postcodeMatch ? postcodeMatch[0].toUpperCase() : "";
}

// Determine zone based on postcode
function determineZone(postcode) {
  if (!postcode) return 'DEFAULT';
  
  if (/^SW[0-9]/.test(postcode)) return 'SW';
  if (/^E[0-9]/.test(postcode)) return 'E';
  if (/^W[0-9]/.test(postcode)) return 'W';
  if (/^N[0-9]/.test(postcode)) return 'N';
  if (/^NW[0-9]/.test(postcode)) return 'NW';
  if (/^SE[0-9]/.test(postcode)) return 'SE';
  
  return 'DEFAULT';
}

// Geocode address using OpenRouteService
async function geocodeAddress(address) {
  try {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) {
      console.warn("ORS_API_KEY not found");
      return null;
    }

    const response = await fetch(
      `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address + ', London, UK')}&boundary.country=GB`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      return data.features[0].geometry.coordinates;
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error.message);
    return null;
  }
}

// Calculate driving route using OpenRouteService
async function calculateDrivingRoute(origin, destination) {
  try {
    const apiKey = process.env.ORS_API_KEY;
    if (!apiKey) return null;

    console.log("Calculating route between:", origin, "and", destination);

    const apiUrl = "https://api.openrouteservice.org/v2/directions/driving-car";
    const bodyData = {
      coordinates: [origin, destination],
      instructions: false,
      preference: "recommended"
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyData)
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.routes && data.routes[0] ? data.routes[0] : null;
  } catch (error) {
    console.error("Routing API error:", error.message);
    return null;
  }
}


router.post("/calculate", async (req, res) => {
  try {
    const { customerAddress } = req.body;

    if (!customerAddress) {
      return res.status(400).json({ error: "Customer address is required" });
    }

    // Extract postcode from address
    const postcode = extractPostcode(customerAddress);
    const zone = determineZone(postcode);
    
    // Check if postcode is in delivery area
    if (zone === 'DEFAULT') {
      return res.status(400).json({
        error: 'Sorry, we do not deliver to this address. Please enter a different address.'
      });
    }

    let distanceKm = null;
    let travelMinutes = null;
    let durationMinutes = null;
    let cost = POSTCODE_ZONES[zone].cost;
    
    // Base delivery time for zone + cooking time
    let estimatedTime = POSTCODE_ZONES[zone].time + COOKING_TIME_MINUTES;

    // Try to get precise calculation if API key is available
    const apiKey = process.env.ORS_API_KEY;
    if (apiKey) {
      try {
        const customerCoords = await geocodeAddress(customerAddress);
        
        if (customerCoords) {
          // Calculate straight-line distance
          distanceKm = calculateDistance(
            RESTAURANT_COORDINATES[1],
            RESTAURANT_COORDINATES[0],
            customerCoords[1],
            customerCoords[0]
          );

          console.log("Straight-line distance:", distanceKm, "km");

          // Check distance first
          if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
            return res.status(400).json({
              error: `Sorry, we don't deliver beyond ${MAX_DELIVERY_DISTANCE_KM} km. Your distance: ${distanceKm.toFixed(1)} km.`
            });
          }

          // Try to get driving route
          const route = await calculateDrivingRoute(RESTAURANT_COORDINATES, customerCoords);
          
          if (route) {
            const distanceMeters = route.summary.distance;
            const durationSeconds = route.summary.duration;
            
            distanceKm = distanceMeters / 1000; // Convert meters to kilometers
            travelMinutes = Math.ceil(durationSeconds / 60);
            durationMinutes = travelMinutes + COOKING_TIME_MINUTES;
            
            // Dynamic pricing based on kilometers
            const baseCost = 3.5;
            const costPerKm = 0.8;
            cost = Math.max(baseCost, Math.round(baseCost + (distanceKm * costPerKm)));
            cost = Math.max(cost, POSTCODE_ZONES[zone].cost);

            // Check driving distance
            if (distanceKm > MAX_DELIVERY_DISTANCE_KM) {
              return res.status(400).json({
                error: `Sorry, we don't deliver beyond ${MAX_DELIVERY_DISTANCE_KM} km. Your route distance: ${distanceKm.toFixed(1)} km.`
              });
            }
          } else {
            // If no route found, use straight-line distance
            // Estimate travel time based on distance (assuming 30 km/h average speed in city)
            travelMinutes = Math.ceil((distanceKm / 30) * 60);
            durationMinutes = travelMinutes + COOKING_TIME_MINUTES;
          }

          // Ensure minimum delivery time
          const minDeliveryTime = POSTCODE_ZONES[zone].time + COOKING_TIME_MINUTES;
          if (durationMinutes < minDeliveryTime) {
            durationMinutes = minDeliveryTime;
          }
        } else {
          // If geocoding failed, use zone-based estimation
          console.warn("Geocoding failed for address:", customerAddress);
        }
      } catch (apiError) {
        console.error("API calculation error:", apiError.message);
        // Fall back to zone-based pricing
      }
    }

    // Final distance check
    if (distanceKm !== null && distanceKm > MAX_DELIVERY_DISTANCE_KM) {
      return res.status(400).json({
        error: `Sorry, we don't deliver beyond ${MAX_DELIVERY_DISTANCE_KM} km. Your distance: ${distanceKm.toFixed(1)} km.`
      });
    }

    // If no precise calculation, use zone-based estimation
    if (durationMinutes === null) {
      durationMinutes = estimatedTime;
    }

    res.json({
      from: RESTAURANT_ADDRESS,
      to: customerAddress,
      distance_km: distanceKm ? distanceKm.toFixed(2) : null,
      duration_min: durationMinutes,
      travel_min: travelMinutes,
      cooking_min: COOKING_TIME_MINUTES,
      cost: cost
    });

  } catch (error) {
    console.error("Delivery calculation error:", error);
    res.status(500).json({ error: "Failed to calculate delivery" });
  }
});

module.exports = router;