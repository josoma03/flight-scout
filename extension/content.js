const TICKET_SELECTOR = '[data-testid="ticket"]';

let extractionTimeout = null;

function getCurrentDate() {
    const elements = [...document.querySelectorAll("[aria-label]")];

    const departElement = elements.find(element => {
        const label = element.getAttribute("aria-label") || "";

        return /^Depart\s+\d{2}\/\d{2}\/\d{4}$/i.test(label);
    });

    if (!departElement) {
        return "";
    }

    const label = departElement.getAttribute("aria-label");

    return label.replace(/^Depart\s+/i, "");
}

function compactDuration(duration) {
    if (!duration) {
        return "";
    }

    return duration
        .replace(/(\d+)\s*hours?/gi, "$1h")
        .replace(/(\d+)\s*minutes?/gi, "$1m")
        .replace(/\s+/g, " ")
        .trim();
}

function getStopCount(value) {
    const numbers = {
        zero: 0,
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5
    };

    const normalized = value.toLowerCase();

    return numbers[normalized] ?? Number(normalized);
}

function extractFlight(ticket, date) {
    const descriptor = ticket.querySelector(
        '[class*="FlightsTicketA11yDescriptor_visuallyHidden"]'
    );

    if (!descriptor) {
        return null;
    }

    const text = descriptor.innerText
        .replace(/\s+/g, " ")
        .trim();

    const priceMatch = text.match(
        /Total cost\s+([\d,.]+)\s*€/i
    );

    const airlineMatch = text.match(
        /Flight with (.+?)\./i
    );

    const routeMatch = text.match(
        /Departing from (.+?) at (\d{2}:\d{2}), arriving in (.+?) at (\d{2}:\d{2})/i
    );

    const durationMatch = text.match(
        /(?:Direct|Indirect) flight taking (.+?)(?: with|\.)/i
    );

    const stopsMatch = text.match(
        /with (zero|one|two|three|four|five|\d+) stops? in (.+?)\./i
    );

    if (!routeMatch) {
        return null;
    }

    const isDirect = /Direct flight/i.test(text);

    let stops = 0;
    let stopLocations = "";

    if (stopsMatch) {
        stops = getStopCount(stopsMatch[1]);

        stopLocations = stopsMatch[2]
            .replace(/\s+and\s+/gi, " + ")
            .trim();
    }

    return {
        date,
        origin: routeMatch[1].trim(),
        destination: routeMatch[3].trim(),
        departureTime: routeMatch[2],
        arrivalTime: routeMatch[4],
        duration: compactDuration(durationMatch?.[1]),
        stops: isDirect ? 0 : stops,
        stopLocations: isDirect ? "" : stopLocations,
        airlines: airlineMatch?.[1]?.trim() || "",
        price: priceMatch
            ? Number(priceMatch[1].replace(/,/g, ""))
            : null,
        currency: "EUR"
    };
}

function extractFlights() {
    const date = getCurrentDate();

    const tickets = [
        ...document.querySelectorAll(TICKET_SELECTOR)
    ];

    return tickets
        .map(ticket => extractFlight(ticket, date))
        .filter(Boolean);
}

function sendFlights() {
    const flights = extractFlights();

    if (flights.length === 0) {
        return;
    }

    chrome.runtime.sendMessage({
        type: "FLIGHTS_FOUND",
        flights
    });
}

function scheduleExtraction() {
    clearTimeout(extractionTimeout);

    extractionTimeout = setTimeout(() => {
        sendFlights();
    }, 1500);
}

const observer = new MutationObserver(() => {
    scheduleExtraction();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

scheduleExtraction();

console.log("FlightScout is running.");