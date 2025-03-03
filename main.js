import { loadMouseCsv } from './loaddata.js';

// Set up dimensions
const width = 900;
const height = 600;
const margin = { top: 60, right: 180, bottom: 60, left: 60 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Create SVG element
const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Create group for the visualization
const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Add title
const title = svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("class", "title")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .text("Daily Activity Patterns Throughout Experiment");

// Create tooltip
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Define the two data sets

// Data Set 1: Daily Activity and Temperature Patterns
const generateDailyPatternData = () => {
    const days = Array.from({ length: 15 }, (_, i) => i + 1);
    
    // Female day activity
    const femaleDay = {
        activity: [22, 25, 22, 21, 27, 28, 26, 20.5, 20, 24.5, 25, 25, 22, 30, 32],
        temperature: [37.7, 38.2, 37.8, 37.9, 38, 38.3, 38, 37.9, 37.8, 38.2, 38, 37.8, 37.8, 38, 37.1]
    };
    
    // Female night activity
    const femaleNight = {
        activity: [8.5, 8, 6.5, 7.5, 11, 8, 9, 9.5, 9.5, 7, 8.5, 8, 8, 10, 10.5],
        temperature: [36.7, 36.8, 36.6, 36.7, 37, 36.9, 36.6, 36.7, 36.8, 36.8, 36.8, 36.7, 36.9, 36.9, 36.7]
    };
    
    // Male day activity
    const maleDay = {
        activity: [31, 35.5, 39.5, 38, 33, 36.5, 39.5, 36.5, 40.5, 34.5, 32.5, 34.5, 25.5, 35, 51],
        temperature: [37.2, 37.5, 37.6, 37.5, 37.4, 37.5, 37.5, 37.4, 37.5, 37.4, 37.3, 37.3, 37, 37.2, 36.3]
    };
    
    // Male night activity
    const maleNight = {
        activity: [13.5, 8, 9, 8, 10, 9.5, 9.5, 9.5, 9.5, 7.5, 8.5, 23.5, 11, 8.5, 8.5],
        temperature: [36.3, 36.1, 36.1, 36.1, 36, 35.9, 35.8, 35.9, 36, 36, 35.9, 36.7, 36.1, 35.7, 35.7]
    };
    
    const result = [];
    
    days.forEach((day, i) => {
        // Female day
        result.push({
            day,
            category: "Female - Day",
            activity: femaleDay.activity[i],
            temperature: femaleDay.temperature[i],
            color: "#4285F4"
        });
        
        // Female night
        result.push({
            day,
            category: "Female - Night",
            activity: femaleNight.activity[i],
            temperature: femaleNight.temperature[i],
            color: "#4255F4"
        });
        
        // Male day
        result.push({
            day,
            category: "Male - Day",
            activity: maleDay.activity[i],
            temperature: maleDay.temperature[i],
            color: "#EA4335"
        });
        
        // Male night
        result.push({
            day,
            category: "Male - Night",
            activity: maleNight.activity[i],
            temperature: maleNight.temperature[i],
            color: "#C5221F"
        });
    });
    
    return result;
};

// Data Set 2: PCA Visualization Data (Sample data points based on the image)
const generatePCAData = () => {
    // Create random data that roughly resembles the PCA visualization
    // This would ideally be your actual PCA data
    const categories = {
        "Non-estrus, Day": { color: "#B0D0E8", count: 100 },
        "Non-estrus, Night": { color: "#3A559F", count: 100 },
        "Estrus, Day": { color: "#F4C145", count: 80 },
        "Estrus, Night": { color: "#E34A44", count: 50 }
    };
    
    const result = [];
    
    // Function to generate random points with some clustering
    const generatePoints = (category, color, count, centerX, centerY, spreadX, spreadY) => {
        for (let i = 0; i < count; i++) {
            const x = centerX + (Math.random() - 0.5) * spreadX;
            const y = centerY + (Math.random() - 0.5) * spreadY;
            
            result.push({
                category,
                color,
                x,
                y,
                pc1: x,
                pc2: y
            });
        }
    };
    
    // Generate points for each category based on their approximate positions in the PCA plot
    generatePoints("Non-estrus, Day", "#B0D0E8", categories["Non-estrus, Day"].count, 1, 0, 3, 1.5);
    generatePoints("Non-estrus, Night", "#3A559F", categories["Non-estrus, Night"].count, -1, 0, 1.5, 1.5);
    generatePoints("Estrus, Day", "#F4C145", categories["Estrus, Day"].count, 1.5, 0.2, 2.5, 1.5);
    generatePoints("Estrus, Night", "#E34A44", categories["Estrus, Night"].count, -0.5, 0, 1.5, 1.5);
    
    return result;
};

const dailyPatternData = generateDailyPatternData();
const pcaData = generatePCAData();

// Map daily pattern data to an initial state similar to PCA for smooth transition
dailyPatternData.forEach((d, i) => {
    // Initialize with positions that will animate to PCA
    d.pc1 = d.day / 5 - 1.5; // Map days to a range similar to PCA x-axis
    d.pc2 = (d.activity / 50) - 0.5; // Map activity to a range similar to PCA y-axis
    
    // Store original positions for line drawing
    d.origX = d.day;
    d.origY = d.activity;
});

// Create scales for daily pattern view
const xScaleDaily = d3.scaleLinear()
    .domain([0, 15])
    .range([0, innerWidth]);

const yScaleActivity = d3.scaleLinear()
    .domain([0, 55])
    .range([innerHeight, 0]);

// Create scales for PCA view
const xScalePCA = d3.scaleLinear()
    .domain([-2.5, 3.5])
    .range([0, innerWidth]);

const yScalePCA = d3.scaleLinear()
    .domain([-1.2, 1.2])
    .range([innerHeight, 0]);

// Initial state: Daily Pattern view
let currentView = "daily";
let currentXScale = xScaleDaily;
let currentYScale = yScaleActivity;

// Create initial axes for daily pattern
const xAxis = g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(xScaleDaily).ticks(15));

const yAxis = g.append("g")
    .call(d3.axisLeft(yScaleActivity));

// Add axis labels
const xLabel = g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 40)
    .attr("text-anchor", "middle")
    .text("Experimental Day");

const yLabel = g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("Average Activity");

// Create a group for the circles
const pointsGroup = g.append("g");

// Create a group for the lines
const linesGroup = g.append("g");

// Define line generators for each category
const categories = ["Female - Day", "Female - Night", "Male - Day", "Male - Night"];
const lineGenerator = d3.line()
    .x(d => xScaleDaily(d.day))
    .y(d => yScaleActivity(d.activity));

// Draw initial lines
categories.forEach(category => {
    const categoryData = dailyPatternData.filter(d => d.category === category);
    const line = linesGroup.append("path")
        .datum(categoryData)
        .attr("fill", "none")
        .attr("stroke", categoryData[0].color)
        .attr("stroke-width", 2)
        .attr("d", lineGenerator)
        .attr("class", "category-line")
        .attr("data-category", category);
});

// Add points
const points = pointsGroup.selectAll(".point")
    .data(dailyPatternData)
    .join("circle")
    .attr("class", "point")
    .attr("cx", d => xScaleDaily(d.day))
    .attr("cy", d => yScaleActivity(d.activity))
    .attr("r", 5)
    .attr("fill", d => d.color)
    .attr("opacity", 0.7)
    .on("mouseover", function(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        
        const html = currentView === "daily" 
            ? `<strong>${d.category}</strong><br>Day: ${d.day}<br>Activity: ${d.activity.toFixed(1)}<br>Temperature: ${d.temperature.toFixed(1)}°C`
            : `<strong>${d.category}</strong><br>PC1: ${d.pc1.toFixed(2)}<br>PC2: ${d.pc2.toFixed(2)}`;
        
        tooltip.html(html)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        
        d3.select(this)
            .attr("r", 8)
            .attr("stroke", "#333")
            .attr("stroke-width", 2);
    })
    .on("mouseout", function() {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        
        d3.select(this)
            .attr("r", 5)
            .attr("stroke", "none");
    });

// Add legend
const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - margin.right + 20}, ${margin.top})`);

const legendItems = categories.map(category => {
    const item = dailyPatternData.find(d => d.category === category);
    return {
        category: item.category,
        color: item.color
    };
});

legend.selectAll(".legend-item")
    .data(legendItems)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 25})`)
    .call(g => {
        g.append("circle")
            .attr("r", 6)
            .attr("fill", d => d.color);
        
        g.append("text")
            .attr("x", 15)
            .attr("y", 4)
            .text(d => d.category);
    });

// Function to transition to PCA view
function transitionToPCA() {
    if (currentView === "pca") return;
    
    currentView = "pca";
    currentXScale = xScalePCA;
    currentYScale = yScalePCA;
    
    // Update title
    title.transition()
        .duration(1000)
        .text("PCA of Mouse Temperature and Activity Colored by Estrus and Day/Night States");
    
    // Update x-axis
    xAxis.transition()
        .duration(1000)
        .call(d3.axisBottom(xScalePCA));
    
    // Update y-axis
    yAxis.transition()
        .duration(1000)
        .call(d3.axisLeft(yScalePCA));
    
    // Update axis labels
    xLabel.transition()
        .duration(1000)
        .text("Principal Component 1 (95.58% variance)");
    
    yLabel.transition()
        .duration(1000)
        .text("Principal Component 2 (4.42% variance)");
    
    // Hide the lines
    linesGroup.selectAll(".category-line")
        .transition()
        .duration(1000)
        .style("opacity", 0);
    
    // Update the legend to match PCA categories
    legend.selectAll(".legend-item").remove();
    
    const pcaCategories = [
        { category: "Non-estrus, Day", color: "#B0D0E8" },
        { category: "Non-estrus, Night", color: "#3A559F" },
        { category: "Estrus, Day", color: "#F4C145" },
        { category: "Estrus, Night", color: "#E34A44" }
    ];
    
    legend.selectAll(".legend-item")
        .data(pcaCategories)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`)
        .call(g => {
            g.append("circle")
                .attr("r", 6)
                .attr("fill", d => d.color);
            
            g.append("text")
                .attr("x", 15)
                .attr("y", 4)
                .text(d => d.category);
        });
    
    // Transition points to PCA positions
    // Map existing points to their nearest PCA equivalents
    const mappedData = dailyPatternData.map(d => {
        const category = d.category;
        let pcaCategory;
        
        // Convert daily pattern categories to PCA categories
        if (category === "Female - Day") {
            pcaCategory = Math.random() > 0.7 ? "Estrus, Day" : "Non-estrus, Day";
        } else if (category === "Female - Night") {
            pcaCategory = Math.random() > 0.7 ? "Estrus, Night" : "Non-estrus, Night";
        } else if (category === "Male - Day") {
            pcaCategory = Math.random() > 0.3 ? "Estrus, Day" : "Non-estrus, Day";
        } else { // Male - Night
            pcaCategory = Math.random() > 0.3 ? "Estrus, Night" : "Non-estrus, Night";
        }
        
        // Find color based on new category
        const color = pcaCategories.find(c => c.category === pcaCategory).color;
        
        // Find a suitable PCA point based on the new category
        const pcaPoints = pcaData.filter(p => p.category === pcaCategory);
        const randomPcaPoint = pcaPoints[Math.floor(Math.random() * pcaPoints.length)];
        
        return {
            ...d,
            category: pcaCategory,
            color: color,
            pc1: randomPcaPoint ? randomPcaPoint.pc1 : (Math.random() * 4 - 2),
            pc2: randomPcaPoint ? randomPcaPoint.pc2 : (Math.random() * 2 - 1)
        };
    });
    
    // Update points with new data
    points.data(mappedData)
        .transition()
        .duration(2000)
        .attr("cx", d => xScalePCA(d.pc1))
        .attr("cy", d => yScalePCA(d.pc2))
        .attr("fill", d => d.color);
}

// Function to transition back to daily view
function transitionToDaily() {
    if (currentView === "daily") return;
    
    currentView = "daily";
    currentXScale = xScaleDaily;
    currentYScale = yScaleActivity;
    
    // Update title
    title.transition()
        .duration(1000)
        .text("Daily Activity Patterns Throughout Experiment");
    
    // Update axes
    xAxis.transition()
        .duration(1000)
        .call(d3.axisBottom(xScaleDaily).ticks(15));
    
    yAxis.transition()
        .duration(1000)
        .call(d3.axisLeft(yScaleActivity));
    
    // Update axis labels
    xLabel.transition()
        .duration(1000)
        .text("Experimental Day");
    
    yLabel.transition()
        .duration(1000)
        .text("Average Activity");
    
    // Show the lines
    linesGroup.selectAll(".category-line")
        .transition()
        .duration(1000)
        .style("opacity", 1);
    
    // Update legend
    legend.selectAll(".legend-item").remove();
    
    legend.selectAll(".legend-item")
        .data(legendItems)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`)
        .call(g => {
            g.append("circle")
                .attr("r", 6)
                .attr("fill", d => d.color);
            
            g.append("text")
                .attr("x", 15)
                .attr("y", 4)
                .text(d => d.category);
        });
    
    // Transition points back to daily pattern
    points.data(dailyPatternData)
        .transition()
        .duration(2000)
        .attr("cx", d => xScaleDaily(d.day))
        .attr("cy", d => yScaleActivity(d.activity))
        .attr("fill", d => d.color);
}

// Scroll handling
function handleScroll() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
    );
    
    const scrollFraction = scrollTop / (documentHeight - windowHeight);
    
    if (scrollFraction < 0.8) {
        transitionToDaily();
    } else if (scrollFraction >= 0.8) {
        transitionToPCA();
    }
}

window.addEventListener("scroll", handleScroll);

// Initial call to set up the visualization
handleScroll();