// heatmap.js - Enhanced heatmap visualization using D3

// Create an enhanced heatmap visualization
function createEnhancedHeatmap(containerId, data, options = {}) {
    // Default options
    const defaults = {
      width: 800,
      height: 500,
      cellSize: 25,
      padding: 3,
      columns: 12, // Number of cells per row
      colors: {
        safe: '#2ecc71',
        suspicious: '#e74c3c'
      }
    };
    
    // Merge options with defaults
    const config = {...defaults, ...options};
    
    // Get the container element
    const container = d3.select(`#${containerId}`);
    
    // Clear existing content
    container.html('');
    
    // Create SVG
    const svg = container.append('svg')
      .attr('width', config.width)
      .attr('height', config.height)
      .attr('viewBox', `0 0 ${config.width} ${config.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // Create a group for the cells
    const cellGroup = svg.append('g')
      .attr('transform', `translate(${config.padding}, ${config.padding})`);
    
    // Calculate total rows needed
    const totalRows = Math.ceil(data.length / config.columns);
    
    // Create cells
    const cells = cellGroup.selectAll('.cell')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'cell')
      .attr('transform', (d, i) => {
        const col = i % config.columns;
        const row = Math.floor(i / config.columns);
        return `translate(${col * (config.cellSize + config.padding)}, ${row * (config.cellSize + config.padding)})`;
      });
    
    // Add rectangles for each cell
    cells.append('rect')
      .attr('width', config.cellSize)
      .attr('height', config.cellSize)
      .attr('rx', 3)
      .attr('ry', 3)
      .attr('fill', d => d.suspicious ? config.colors.suspicious : config.colors.safe)
      .attr('opacity', 0.8)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke', '#2c3e50')
          .attr('stroke-width', 2);
        
        // Show tooltip
        tooltip.style('visibility', 'visible')
          .html(`
            <strong>${d.filename}</strong><br>
            Status: ${d.suspicious ? 'Suspicious' : 'Safe'}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('opacity', 0.8)
          .attr('stroke', 'none');
        
        // Hide tooltip
        tooltip.style('visibility', 'hidden');
      });
    
    // Add abbreviated text labels
    cells.append('text')
      .attr('x', config.cellSize / 2)
      .attr('y', config.cellSize / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '8px')
      .text(d => {
        const name = d.filename;
        return name.length > 6 ? name.substring(0, 4) + '...' : name;
      });
    
    // Create a tooltip
    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'absolute')
      .style('padding', '8px')
      .style('background', '#34495e')
      .style('color', '#fff')
      .style('border-radius', '4px')
      .style('font-size', '12px')
      .style('visibility', 'hidden')
      .style('pointer-events', 'none')
      .style('z-index', 1000);
    
    // Create a legend
    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${config.padding}, ${totalRows * (config.cellSize + config.padding) + 20})`);
    
    // Safe files legend
    const safeLegend = legend.append('g')
      .attr('transform', 'translate(0, 0)');
    
    safeLegend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', config.colors.safe);
    
    safeLegend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text('Safe Files')
      .attr('font-size', '12px');
    
    // Suspicious files legend
    const suspiciousLegend = legend.append('g')
      .attr('transform', 'translate(100, 0)');
    
    suspiciousLegend.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('rx', 2)
      .attr('ry', 2)
      .attr('fill', config.colors.suspicious);
    
    suspiciousLegend.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .text('Suspicious Files')
      .attr('font-size', '12px');
    
    // Add a title
    svg.append('text')
      .attr('x', config.width / 2)
      .attr('y', totalRows * (config.cellSize + config.padding) + 60)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('File Analysis Heatmap');
    
    // Add stats text
    const safeCount = data.filter(d => !d.suspicious).length;
    const suspiciousCount = data.filter(d => d.suspicious).length;
    
    svg.append('text')
      .attr('x', config.width / 2)
      .attr('y', totalRows * (config.cellSize + config.padding) + 80)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text(`Total: ${data.length} files (${safeCount} safe, ${suspiciousCount} suspicious)`);
    
    return svg.node();
  }
  
  // Function to generate a clustered heatmap
  function createClusteredHeatmap(containerId, data, options = {}) {
    // Group files by similarity of their suspicious status
    const clusters = d3.group(data, d => d.suspicious ? 'suspicious' : 'safe');
    
    // Sort each cluster by filename
    clusters.forEach((value, key) => {
      clusters.set(key, value.sort((a, b) => a.filename.localeCompare(b.filename)));
    });
    
    // Flatten the data back, but now clustered
    const clusteredData = [
      ...(clusters.get('suspicious') || []),
      ...(clusters.get('safe') || [])
    ];
    
    // Create the heatmap with clustered data
    return createEnhancedHeatmap(containerId, clusteredData, options);
  }
  
  // Export functions for use in other scripts
  if (typeof module !== 'undefined') {
    module.exports = {
      createEnhancedHeatmap,
      createClusteredHeatmap
    };
  }