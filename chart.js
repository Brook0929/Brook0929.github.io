// This function is used to convert the data values to numbers where needed
// Items with '+d' are parsed as a number
function type(d) {
  return {
    Season: +d["Season"],
    "No. of Episode (Season)": +d["No. of Episode (Season)"],
    "No. of Episode (Overall)": +d["No. of Episode (Overall)"],
    "Title of the Episode": d["Title of the Episode"],
    "Running Time (Minutes)": +d["Running Time (Minutes)"],
    "Directed by": d["Directed by"],
    "Written by": d["Written by"],
    "Original Air Date": d["Original Air Date"],
    "U.S. Viewers (Millions)": +d["U.S. Viewers (Millions)"],
    "Music by": d["Music by"],
    "Cinematography by": d["Cinematography by"],
    "Editing by": d["Editing by"],
    "IMDb Rating": +d["IMDb Rating"],
    "Rotten Tomatoes Rating (Percentage)":
      +d["Rotten Tomatoes Rating (Percentage)"],
    "Metacritic Ratings": +d["Metacritic Ratings"],
    Ordered: d["Ordered"],
    "Filming Duration": d["Filming Duration"],
    "Novel(s) Adapted": d["Novel(s) Adapted"],
    Synopsis: d["Synopsis"],
  };
}

// These variables are used to control the size and display of the graph
// You can set your own values in place of the 'window.innerWidth / 2' and 'window.innerHeight / 2',
// they just currently size the chart at half the window size
// You can also tweak the margins if you run into issues with the axis labels being cut off
var margin = { top: 50, right: 50, bottom: 100, left: 80 };
var width = window.innerWidth / 1 - margin.left - margin.right;
var height = window.innerHeight / 1 - margin.top - margin.bottom;

// This block creates the graph area on the page
var svg = d3
  .select("#vis") // select the id="vis" div in the html
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Load in the CSV data and format using the 'type' function at the top of the file
d3.csv("Game_of_Thrones.csv", type).then((csv_data) => {
  // Here we're running through the CSV and creating an array where each item looks like:
  // ["directed by", average-RT-rating]
  // So index 0 of our array will be the director, and
  // index 1 of our array will be the average RT rating
  // When we access these values it's usually as "d[0]" and "d[1]"
  var data = Array.from(
    d3.rollup(
      csv_data,
      (v) =>
        d3.mean(v, (d) => {
          return d["Rotten Tomatoes Rating (Percentage)"];
        }),
      (d) => d["Directed by"]
    )
  );

  // Initialize the x axis
  var x = d3.scaleBand().range([0, width]).padding(0.2);
  var xAxis = svg.append("g").attr("transform", `translate(0, ${height})`);

  // Initialize the y axis
  var y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(data, (d) => {
        return d[1];
      }),
    ])
    .range([height, 0]);
  var yAxis = svg.append("g");

  // Creating a tooltip for hovering the bars
  var tooltip = d3
    .select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0) // the tooltip is initially hidden
    .style("background-color", "white") // background color for the tooltip
    .style("border", "2px solid black") // giving it a border
    .style("border-radius", "5px") // rounded edges
    .style("padding", "5px"); // little bit of padding for the tooltip text

  // These functions control the tooltip when the mouse hovers over, moves within, or leaves a bar
  // This function runs when the mouse enters a bar in the graph
  var mouseover = (event, d) => {
    tooltip.style("opacity", 1); // make the tooltip visible
    d3.select(event.target)
      .style("stroke", "black") // give the bar a black outline
      .style("opacity", 1); // darken the bar a bit to make it apparent which is hovered
  };
  // This function runs when the mouse moves within the bounds of a bar in the graph
  var mousemove = (event, d, filtered) => {
    const [x, y] = d3.pointer(event);
    tooltip
      .html(`Rotten Tomatoes Rating: ${d[1].toFixed(2)}`) // set the text in the tooltip (we're inserting d[1] which is the average RT rating from the array on line 52)
      .style("top", `${y}px`)
      .style("left", `${x + 70}px`);
  };
  // This function runs when the mouse leaves a bar, i.e. it's no longer hovered
  var mouseleave = (event, d) => {
    tooltip.style("opacity", 0); // hide the tooltip
    d3.select(event.target)
      .style("stroke", "none") // remove the outline on the bar
      .style("opacity", 0.5); // reset the bar back to half opacity
  };

  // This function renders the full data, meaning the average RT rating by director
  var returnToFullData = (event, d) => {
    // Build the same array we build at line 52
    var fulldata = Array.from(
      d3.rollup(
        csv_data,
        (v) =>
          d3.mean(v, (d) => {
            return d["Rotten Tomatoes Rating (Percentage)"];
          }),
        (d) => d["Directed by"]
      )
    );
    // Hide the tooltip, then redraw the graph (update is defined on line 160)
    tooltip.style("opacity", 0);
    update(fulldata, false);
  };

  // This function renders the subset data, meaning the RT rating for each episode by a director
  // This will be called when clicking on a bar in the main graph, filtering down to episodes by the director we clicked on
  var filterData = (event, d) => {
    // Here we build an array like before, only this time we are only getting episodes by the clicked director
    // our array here will be:
    // ["episode title", RT-rating]
    // So with this data d[0] becomes the episode title and d[1] becomes that episode's rating
    var subdata = Array.from(
      d3.rollup(
        // Here we're filtering the CSV for entries that match the director we clicked on (represented by d[0] here)
        d3.filter(csv_data, (i) => i["Directed by"] == d[0]),
        (v) =>
          d3.sum(v, (f) => {
            return f["Rotten Tomatoes Rating (Percentage)"];
          }),
        (d) => d["Title of the Episode"]
      )
    );
    // Redraw the graph (update is defined on line 160)
    tooltip.style("opacity", 0);
    update(subdata, true);
  };

  // This function redraws the graph given the specified data, passed in the "data" variable
  // We also pass a "filtered" variable thats TRUE/FALSE depending on if we're viewing the full data or the data for a specific director.
  // We can use that filtered variable to control what happens when we click on bars in the graph
  var update = (data, filtered) => {
    // Update the x axis
    x.domain(
      data
        .sort((a, b) => {
          return d3.ascending(a[0], b[0]);
        })
        .map((d) => {
          return d[0];
        })
    );
    xAxis
      .call(d3.axisBottom(x))
      .attr("transform", `translate(0, ${height})`)
      .selectAll("text")
      .attr("transform", "translate(-10, 0) rotate(-45)")
      .style("text-anchor", "end");

    // Update the y axis
    y.domain([
      0,
      d3.max(data, (d) => {
        return d[1];
      }),
    ]);
    yAxis.transition().duration(1000).call(d3.axisLeft(y));

    // Here we draw the bars for our data
    var u = svg.selectAll("rect").data(data);
    u.enter()
      .append("rect")
      .merge(u)
      .attr("x", (d) => {
        return x(d[0]); // set at the x position of d[0], either the director, or the episode title
      })
      .attr("y", (d) => {
        return y(0); // start out with a height of 0, this lets us animate the bars
      })
      .attr("width", x.bandwidth())
      .attr("height", (d) => {
        return height - y(0); // start out with a height of 0, this lets us animate the bars
      })
      .attr("fill", "#05b6e7") // color of the bar
      .style("stroke-width", 2) // width of the outline that shows on hover
      .style("stroke", "none") // default to no outline
      .style("opacity", 0.5) // default to half opacity, allows us to darken on hover
      .on("mouseover", mouseover) // call the function for controlling the tooltip, defined on line 94
      .on("mousemove", mousemove) // call the function for controlling the tooltip, defined on line 101
      .on("mouseleave", mouseleave) // call the function for controlling the tooltip, defined on line 109
      // Here's where we use the "filtered" variable to control what happens on click
      // This format may look funky but it's basically:
      // condition ? do this if it's true : do this if it's false
      // So here filtered will either be false if we're viewing the full data, or true if we've clicked into a specific director.
      // So if filtered is true, when we click we run the function to redraw the full data graph.
      // And if filtered is false, when we click we run the function to draw the graph of episodes by the director we clicked on
      .on("click", filtered ? returnToFullData : filterData);

    // Here we're adding the animation for the bars to grow to their height
    svg
      .selectAll("rect")
      .transition()
      .duration(800)
      .attr("y", (d) => {
        return y(d[1]); // go to the y position for our data point
      })
      .attr("height", (d) => {
        return height - y(d[1]); // go to the y position for our data point
      })
      .delay((d, i) => {
        return i * 100; // stagger each bar animation slightly so they don't all go at once, just cause it looks neat
      });

    u.exit().remove();
  };

  // Draw the initial graph
  update(data, false);
});

