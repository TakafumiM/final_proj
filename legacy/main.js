import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm";
import { createScatterplot, updateScatterplot } from './scatterplot.js';
import { loadData } from './loaddata.js';

let data;
let svg;
let x;
let y;
let line;
let width;
let height;
let tooltip;
let currentSex = 'male';
let currentIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];
let currentDataType = 'act';
let scatterplotCreated = false;

document.addEventListener('DOMContentLoaded', async () => {
    data = await loadData(); // Load data and assign it
    createLineplot();
    document.getElementById('updatePlot').addEventListener('click', () => {
        const sex = document.getElementById('sex').value;
        const checkedIds = Array.from(document.querySelectorAll('#id-container input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value);
        const dataType = document.getElementById('dataType').value;
        updatePlot(sex, checkedIds, dataType);
        currentSex = sex;
        currentIds = checkedIds;
        currentDataType = dataType;
    });

    document.getElementById('selectAll').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#id-container input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
    });

    document.getElementById('clearAll').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#id-container input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    });

    const compareButton = document.getElementById('observe');
    compareButton.addEventListener('click', () => {
        const lineplotContainer = document.getElementById('lineplot-container');
        const scatterplotContainer = document.getElementById('scatterplot-container');
        const scatterplotControls = document.getElementById('scatterplot-controls');
        const lineplotControls = document.getElementById('controls');

        if (compareButton.textContent === 'Compare') {
            // Switch to scatterplot view
            lineplotContainer.style.display = 'none';
            scatterplotContainer.style.display = 'block';
            scatterplotControls.style.display = 'block';
            lineplotControls.style.display = 'none';
            compareButton.textContent = 'Observe';

            const sex = document.getElementById('sex').value;
            const checkedIds = Array.from(document.querySelectorAll('#id-container input[type="checkbox"]:checked'))
                .map(checkbox => checkbox.value);

            // Clear the container and create new scatterplot
            d3.select("#scatterplot-container").selectAll("*").remove();
            createScatterplot(data, sex, checkedIds[0], currentDataType);
            scatterplotCreated = true;
        } else {
            // Switch to lineplot view
            lineplotContainer.style.display = 'block';
            scatterplotContainer.style.display = 'none';
            scatterplotControls.style.display = 'none';
            lineplotControls.style.display = 'block';
            compareButton.textContent = 'Compare';
        }
    });

    document.getElementById('updateScatterplot').addEventListener('click', () => {
        const scatterplotSex = document.getElementById('scatterplotSex').value;
        const scatterplotId = document.getElementById('scatterplotId').value;
        const dayNight = document.getElementById('dayNight').value;
        const estrus = document.getElementById('estrus').value;
        updateScatterplot(data, scatterplotSex, scatterplotId, currentDataType, dayNight, estrus);
    });

    const observeButton = document.createElement('button');
    observeButton.id = 'observe';
    observeButton.textContent = 'Observe';
    observeButton.addEventListener('click', () => {
        const lineplotContainer = document.getElementById('lineplot-container');
        const scatterplotContainer = document.getElementById('scatterplot-container');
        const scatterplotControls = document.getElementById('scatterplot-controls');
        const lineplotControls = document.getElementById('controls'); // Lineplot controls
        lineplotContainer.style.display = 'block';
        scatterplotContainer.style.display = 'none';
        scatterplotControls.style.display = 'none'; // Hide scatterplot controls
        lineplotControls.style.display = 'block'; // Show lineplot controls
        compareButton.textContent = 'Compare';
    });
    document.getElementById('scatterplot-controls').appendChild(observeButton);
});


async function createLineplot() {
    const margin = { top: 50, right: 30, bottom: 40, left: 50 };
    width = 800 - margin.left - margin.right;
    height = 400 - margin.top - margin.bottom;

    const totalWidth = width + margin.left + margin.right + 150; // Increased width for legend

    svg = d3.select("#lineplot-container").append("svg")
        .attr("width", totalWidth) // Set width to accommodate legend
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.time)])
        .range([0, width]);

    y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(Object.values(data[0]).slice(3)))])
        .range([height, 0]);

    line = d3.line()
        .x(d => x(d.time))
        .y(d => d.value);

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 20]) // Set zoom limits
        .translateExtent([[0, 0], [width, height]]) // Set pan limits
        .on("zoom", zoomed);

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(zoom);

    function zoomed(event) {
        const transform = event.transform;
        x.range([0, width].map(d => transform.applyX(d)));

        // Update x-axis with zoom
        svg.selectAll(".axis.x").remove();

        let tickFormat;
        if (transform.k > 4) {
            tickFormat = d => `Day ${Math.floor(d / 24) + 1}, Hour ${d % 24}`;
        } else {
            tickFormat = d => `Day ${Math.floor(d / 24) + 1}`;
        }

        svg.append("g")
            .attr("class", "axis x")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .ticks(width / (transform.k * 50))
                .tickFormat(tickFormat));

        // Update the plot with the new scales
        updatePlot(document
            .getElementById('sex')
            .value, 
            Array.from(document.querySelectorAll('#id-container input[type="checkbox"]:checked'))
            .map(checkbox => checkbox.value), 
            document.getElementById('dataType')
            .value);
    }

    // Initialize tooltip
    tooltip = d3.select("#tooltip");

    window.updatePlot = function(sex, ids, dataType) { // Make updatePlot globally accessible
        const maxValue = d3.max(data, d => {
            let maxVal = 0;
            ids.forEach(id => {
                const val = d[`m${id}_${dataType}`] || d[`f${id}_${dataType}`];
                if (val !== undefined && val > maxVal) {
                    maxVal = val;
                }
            });
            return maxVal;
        });

        let yDomain = [0, maxValue];
        if (dataType === 'temp') {
            yDomain = [0, maxValue * 1.1]; // Increase the maximum value by 10% for temperature
        }

        y = d3.scaleLinear()
            .domain(yDomain)
            .range([height, 0]);

        svg.selectAll(".line").remove();
        svg.selectAll(".axis").remove();
        svg.selectAll(".title").remove(); // Remove previous title
        svg.selectAll(".legend").remove(); // Remove previous legend
        svg.selectAll(".night-bg").remove(); // Remove previous night backgrounds
        svg.selectAll(".estrus-bg").remove(); // Remove previous estrus backgrounds
        svg.selectAll(".grid").remove(); // Remove previous grid

        // Add title
        svg.append("text")
            .attr("x", (width / 2))
            .attr("y", 0 - (margin.top / 2))
            .attr("text-anchor", "middle")
            .attr("class", "title")
            .style("font-size", "16px")
            .style("text-decoration", "underline")
            .text(`${sex.charAt(0).toUpperCase() + sex.slice(1)} ${dataType === 'act' ? 'Activity' : 'Temperature'} Data`);

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d => `Day ${Math.floor(d / 24) + 1}, Hour ${d % 24}`));

        svg.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y));

        // Add Y-axis grid lines
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y)
                .ticks(10) // Adjust the number of ticks as needed
                .tickSize(-width) // Make the lines span the entire plot width
                .tickFormat("") // Remove the tick labels
            );

        // Add background for is_estrus
        const estrusData = data.filter(d => d.is_estrus);
        svg.selectAll(".estrus-bg")
            .data(estrusData)
            .enter().append("rect")
            .attr("class", "estrus-bg")
            .attr("x", d => x(d.time))
            .attr("y", 0)
            .attr("width", width / data.length) // Adjust width as needed
            .attr("height", height)
            .attr("fill", "pink")
            .style("opacity", 0.3);

        ids.forEach(id => {
            const filteredData = data.filter(d => {
                let prefix = sex === 'male' ? 'm' : 'f';
                let dataColumn = `${prefix}${id}_${dataType}`;
                return d[dataColumn] !== undefined;
            });

            const plotData = filteredData.map(d => ({
                time: d.time,
                value: d[`${sex === 'male' ? 'm' : 'f'}${id}_${dataType}`]
            }));

            svg.append("path")
                .datum(plotData)
                .attr("fill", "none")
                .attr("stroke-width", 1.5)
                .attr("d", line.y(d => y(d.value))) // Update the y position based on the new scale
                .attr("class", `line line-${id}`) // Add a class to each line
                .on("mouseover", function(event, d) {
                    tooltip.style("display", "block");
                })
                .on("mouseout", function(event, d) {
                    tooltip.style("display", "none");
                })
                .on("mousemove", function(event, d) {
                    const [xPos, yPos] = d3.pointer(event);
                    const bisect = d3.bisector(d => d.time).left;
                    const x0 = x.invert(xPos);
                    const i = bisect(d, x0, 1);
                    const d0 = d[i - 1];
                    const d1 = d[i];
                    const dataPoint = x0 - d0.time > d1.time - x0 ? d1 : d0;

                    tooltip.html(`Day: ${Math.floor(dataPoint.time / 24) + 1}, Hour: ${dataPoint.time % 24}, Value: ${dataPoint.value}`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 15) + "px");
                });
        });

        // Add legend
        const legend = svg.append("g")
            .attr("class", "legend");

        // Calculate legend position based on zoom transform
        const currentTransform = d3.zoomTransform(svg.node());
        const legendX = width + 20; // Position to the right of the plot
        const legendY = 0;

        legend.attr("transform", `translate(${legendX},${legendY})`);

        ids.forEach((id, i) => {
            legend.append("rect")
                .attr("x", 0) // Position to the right of the plot
                .attr("y", i * 20)
                .attr("width", 10)
                .attr("height", 10)
                .attr("class", `line-${id}`)
                .style("fill",  function() { return window.getComputedStyle(this).getPropertyValue("stroke"); });

            legend.append("text")
                .attr("x", 15) // Position to the right of the plot
                .attr("y", i * 20 + 9)
                .text(`ID ${id}`)
                .style("font-size", "12px")
                .attr("alignment-baseline", "middle");
        });

        svg.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d => `Day ${Math.floor(d / 24) + 1}, Hour ${d % 24}`));
    }

    // Initial plot
    updatePlot('male', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'], 'act');
}