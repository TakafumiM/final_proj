import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";

let scatterSvg;
let scatterX;
let scatterY;
let correlationLine;
let scatterWidth;
let scatterHeight;
let initialXDomain;
let initialYDomain;
let margin = { top: 50, right: 150, bottom: 50, left: 50 }; // Define margin here

export function createScatterplot(data, sex = 'male', id, dataType) {
    scatterWidth = 750 - margin.left - margin.right; // Increase scatterWidth
    scatterHeight = 400 - margin.top - margin.bottom;

    scatterSvg = d3.select("#scatterplot-container").append("svg")
        .attr("width", scatterWidth + margin.left + margin.right)
        .attr("height", scatterHeight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    scatterX = d3.scaleLinear()
        .range([0, scatterWidth]);

    scatterY = d3.scaleLinear()
        .range([scatterHeight, 0]);

    correlationLine = scatterSvg.append("line")
        .attr("class", "correlation-line");

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 20]) // Set zoom limits
        .translateExtent([[0, 0], [scatterWidth, scatterHeight]]) // Set pan limits
        .on("zoom", zoomed);

    scatterSvg.append("rect")
        .attr("width", scatterWidth)
        .attr("height", scatterHeight)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(zoom);

    function zoomed(event) {
        const transform = event.transform;
        scatterX.range([0, scatterWidth].map(d => transform.applyX(d)));
        scatterY.range([scatterHeight, 0].map(d => transform.applyY(d)));

        // Redraw the points
        scatterSvg.selectAll("circle")
            .attr("cx", d => scatterX(d[`${sex === 'male' ? 'm' : 'f'}${id}_act`]))
            .attr("cy", d => scatterY(d[`${sex === 'male' ? 'm' : 'f'}${id}_temp`]));

        // Update axes
        scatterSvg.select(".x-axis").call(d3.axisBottom(scatterX));
        scatterSvg.select(".y-axis").call(d3.axisLeft(scatterY));

        updateGrid();

        const activityColumn = `${sex === 'male' ? 'm' : 'f'}${id}_act`;
        const temperatureColumn = `${sex === 'male' ? 'm' : 'f'}${id}_temp`;
        const filteredData = data.filter(d => (
            d[activityColumn] !== undefined && d[temperatureColumn] !== undefined
        ));
        const activityData = filteredData.map(d => d[activityColumn]);
        const temperatureData = filteredData.map(d => d[temperatureColumn]);
        const linearRegression = calculateLinearRegression(activityData, temperatureData);
        const slope = linearRegression.slope;
        const intercept = linearRegression.intercept;

        const x1 = scatterX(0);
        const y1 = scatterY(intercept);
        const x2 = scatterX(d3.max(activityData));
        const y2 = scatterY(slope * d3.max(activityData) + intercept);

        correlationLine
            .attr("x1", x1)
            .attr("y1", y1)
            .attr("x2", x2)
            .attr("y2", y2);
    }

    updateScatterplot(data, sex, id, dataType, 'all', 'all');
}

export function updateScatterplot(data, sex, id, dataType, dayNight, estrus) {
    const activityColumn = `${sex === 'male' ? 'm' : 'f'}${id}_act`;
    const temperatureColumn = `${sex === 'male' ? 'm' : 'f'}${id}_temp`;

    // Filter data based on day/night and estrus
    let filteredData = data.filter(d => {
        const isNight = d.is_night === true;
        const isEstrus = d.is_estrus === true;

        if (dayNight === 'day' && isNight) return false;
        if (dayNight === 'night' && !isNight) return false;
        if (estrus === 'estrus' && !isEstrus) return false;
        if (estrus === 'non-estrus' && isEstrus) return false;
        return true;
    });

    // Filter out rows where either activity or temperature is undefined
    filteredData = filteredData.filter(d => (
        d[activityColumn] !== undefined && d[temperatureColumn] !== undefined
    ));

    const activityData = filteredData.map(d => d[activityColumn]);
    const temperatureData = filteredData.map(d => d[temperatureColumn]);

    // Updated scale domains after filtering
    if (activityData.length > 0) {
        scatterX.domain([0, d3.max(activityData)]);
    } else {
        scatterX.domain([0, 1]); //default domain if no data
    }

    if (temperatureData.length > 0) {
        scatterY.domain([0, d3.max(temperatureData)]);
    } else {
        scatterY.domain([0, 1]); //default domain if no data
    }

    // Calculate linear regression
    const linearRegression = calculateLinearRegression(activityData, temperatureData);
    const slope = linearRegression.slope;
    const intercept = linearRegression.intercept;

    // Remove existing circles
    scatterSvg.selectAll("circle").remove();

    scatterSvg.selectAll(".axis").remove();

    // Add scatter points
    scatterSvg.selectAll("circle")
        .data(filteredData)
        .enter().append("circle")
        .attr("cx", d => scatterX(d[activityColumn]))
        .attr("cy", d => scatterY(d[temperatureColumn]))
        .attr("r", 3)
        .style("fill", d => {
            if (d.is_night && d.is_estrus) {
                return "purple"; // Night and Estrus
            } else if (d.is_night) {
                return "blue"; // Night and Non-Estrus
            } else if (d.is_estrus) {
                return "red"; // Day and Estrus
            } else {
                return "green"; // Day and Non-Estrus
            }
        });

    // Add correlation line
    const x1 = scatterX(0);
    const y1 = scatterY(intercept);
    const x2 = scatterX(d3.max(activityData));
    const y2 = scatterY(slope * d3.max(activityData) + intercept);

    correlationLine
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2);

    // Add axes
    scatterSvg.append("g")
        .attr("class", "axis x-axis")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(scatterX));

    scatterSvg.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(scatterY));

    updateGrid();

    createScatterplotLegend();

    scatterSvg.append("text")
        .attr("class", "axis-label")
        .attr("transform", `translate(${scatterWidth / 2}, ${scatterHeight + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .text("Activity");

    // Add Y-axis label
    scatterSvg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 10)
        .attr("x", 0 - (scatterHeight / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Temperature");

    // Add title
    const dayNightText = dayNight === 'all' ? '' : `, ${dayNight.charAt(0).toUpperCase() + dayNight.slice(1)}`;
    const estrusText = estrus === 'all' ? '' : `, ${estrus.charAt(0).toUpperCase() + estrus.slice(1)}`;
    scatterSvg.selectAll(".scatter-title").remove();
    scatterSvg.append("text")
        .attr("class", "scatter-title")
        .attr("x", (scatterWidth / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text(`${(sex || 'male').charAt(0).toUpperCase() + (sex || 'male').slice(1)} ${id}${dayNightText}${estrusText}`);
}

function createScatterplotLegend() {
    const legendData = [
        { color: "purple", label: "Night & Estrus" },
        { color: "blue", label: "Night & Non-Estrus" },
        { color: "red", label: "Day & Estrus" },
        { color: "green", label: "Day & Non-Estrus" }
    ];

    const legend = scatterSvg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${scatterWidth + 20}, 20)`); // Adjust the translate values

    legend.selectAll("rect")
        .data(legendData)
        .enter().append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("width", 10)
        .attr("height", 10)
        .style("fill", d => d.color);

    legend.selectAll("text")
        .data(legendData)
        .enter().append("text")
        .attr("x", 15)
        .attr("y", (d, i) => i * 20 + 9)
        .text(d => d.label)
        .attr("alignment-baseline", "middle")
        .style("font-size", "10px");
}

// Function to calculate linear regression
function calculateLinearRegression(xData, yData) {
    const n = xData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += xData[i];
        sumY += yData[i];
        sumXY += xData[i] * yData[i];
        sumX2 += xData[i] * xData[i];
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = meanY - slope * meanX;

    return { slope: slope, intercept: intercept };
}

function updateGrid() {
    // Remove existing grid
    scatterSvg.selectAll(".grid").remove();

    // Add Y-axis grid lines
    scatterSvg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(scatterY)
            .ticks(10) // Adjust the number of ticks as needed
            .tickSize(-scatterWidth) // Make the lines span the entire plot width
            .tickFormat("") // Remove the tick labels
        );

    // Add X-axis grid lines
    scatterSvg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(scatterX)
            .ticks(10) // Adjust the number of ticks as needed
            .tickSize(-scatterHeight) // Make the lines span the entire plot height
            .tickFormat("") // Remove the tick labels
        );

    scatterSvg.selectAll(".grid").lower();
}