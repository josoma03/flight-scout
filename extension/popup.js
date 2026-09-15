const flightCount = document.getElementById("flightCount");
const viewButton = document.getElementById("viewButton");
const copyButton = document.getElementById("copyButton");
const csvButton = document.getElementById("csvButton");
const clearButton = document.getElementById("clearButton");
const message = document.getElementById("message");

function showMessage(text) {
    message.textContent = text;

    setTimeout(() => {
        message.textContent = "";
    }, 2500);
}

function getFlights() {
    return new Promise(resolve => {
        chrome.storage.local.get(
            { flights: [] },
            result => resolve(result.flights)
        );
    });
}

async function updateCount() {
    const flights = await getFlights();

    flightCount.textContent = flights.length;
}

function formatDuration(flight) {
    if (flight.stops === 0) {
        return `${flight.duration} - Direct`;
    }

    const label =
        flight.stops === 1
            ? "1 stop"
            : `${flight.stops} stops`;

    return `${flight.duration} - ${label}${
        flight.stopLocations
            ? `: ${flight.stopLocations}`
            : ""
    }`;
}

function markdownTable(flights) {
    const header =
        "| Fecha | Origen | Destino | Hora | Duracion | Valor |\n" +
        "| ----- | ------- | ------- | ---- | -------- | ----- |";

    const rows = flights.map(flight => {
        const time =
            `${flight.departureTime} - ${flight.arrivalTime}`;

        const duration = formatDuration(flight);

        const price =
            flight.price !== null
                ? `€${flight.price}`
                : "";

        return (
            `| ${flight.date} ` +
            `| ${flight.origin} ` +
            `| ${flight.destination} ` +
            `| ${time} ` +
            `| ${duration} ` +
            `| ${price} |`
        );
    });

    return [
        header,
        ...rows
    ].join("\n");
}

viewButton.addEventListener("click", async () => {
    const flights = await getFlights();

    if (flights.length === 0) {
        showMessage("No flights captured yet.");
        return;
    }

    console.table(flights);

    showMessage(
        `${flights.length} flights available.`
    );
});

copyButton.addEventListener("click", async () => {
    const flights = await getFlights();

    if (flights.length === 0) {
        showMessage("No flights to copy.");
        return;
    }

    const table = markdownTable(flights);

    await navigator.clipboard.writeText(table);

    showMessage("Table copied.");
});

csvButton.addEventListener("click", async () => {
    const flights = await getFlights();

    if (flights.length === 0) {
        showMessage("No flights to export.");
        return;
    }

    const header = [
        "Date",
        "Origin",
        "Destination",
        "Departure",
        "Arrival",
        "Duration",
        "Stops",
        "Stop locations",
        "Airlines",
        "Price",
        "Currency"
    ];

    const rows = flights.map(flight => [
        flight.date,
        flight.origin,
        flight.destination,
        flight.departureTime,
        flight.arrivalTime,
        flight.duration,
        flight.stops,
        flight.stopLocations,
        flight.airlines,
        flight.price,
        flight.currency
    ]);

    const escapeCSV = value => {
        const string = String(value ?? "");

        return `"${string.replace(/"/g, '""')}"`;
    };

    const csv = [
        header,
        ...rows
    ]
        .map(row =>
            row.map(escapeCSV).join(",")
        )
        .join("\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "flights.csv";

    link.click();

    URL.revokeObjectURL(url);

    showMessage("CSV exported.");
});

clearButton.addEventListener("click", () => {
    chrome.storage.local.set(
        { flights: [] },
        () => {
            updateCount();
            showMessage("Flights cleared.");
        }
    );
});

updateCount();