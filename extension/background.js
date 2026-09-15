function flightKey(flight) {
    return [
        flight.date,
        flight.origin,
        flight.destination,
        flight.departureTime,
        flight.arrivalTime,
        flight.duration,
        flight.price
    ].join("|");
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        if (message.type !== "FLIGHTS_FOUND") {
            return;
        }

        chrome.storage.local.get(
            { flights: [] },
            result => {
                const existingFlights = result.flights;

                const existingKeys = new Set(
                    existingFlights.map(flightKey)
                );

                let added = 0;

                for (const flight of message.flights) {
                    const key = flightKey(flight);

                    if (!existingKeys.has(key)) {
                        existingFlights.push(flight);
                        existingKeys.add(key);
                        added++;
                    }
                }

                chrome.storage.local.set({
                    flights: existingFlights
                });

                console.log(
                    `FlightScout: ${added} new flights. ` +
                    `${existingFlights.length} total.`
                );

                sendResponse({
                    added,
                    total: existingFlights.length
                });
            }
        );

        return true;
    }
);