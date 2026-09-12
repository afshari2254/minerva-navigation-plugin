// Wrap the plugin code in an isolated function scope.
(function () {
    'use strict';  // Enable stricter JavaScript error checking.
    // Define the main plugin object.
    var AtlasIntelligence = function () {
        this.name = 'Rohit_Map_Navigation'; 
        this.version = '3.1.0';
        this.id = 'atlas_intel_v31';
    };

    AtlasIntelligence.prototype.getName = function () { return this.name; };
    AtlasIntelligence.prototype.getVersion = function () { return this.version; };
    AtlasIntelligence.prototype.getId = function () { return this.id; };
    
// Register the plugin and access the MINERVA API.
    AtlasIntelligence.prototype.register = function (minervaProxy) {
        var container = minervaProxy.element;  // Get the HTML container provided by MINERVA.
        
        var style = document.createElement('style'); // Create a CSS style element for the plugin interface.
        style.innerHTML = `
        // Define the visual style of the plugin interface.
        
            .intel-wrapper { font-family: 'Segoe UI', Tahoma, sans-serif; height: 750px; display: flex; flex-direction: column; background: #fff; border: 1px solid #d1d9e6; border-radius: 12px; overflow: hidden; }
            .intel-header { background: #1a237e; color: white; padding: 25px; }
            .intel-search { width: 100%; padding: 15px; border-radius: 8px; border: 4px solid #ffd600; background: #fff !important; color: #000 !important; font-size: 16px; font-weight: bold; margin-top: 10px; }
            .intel-body { display: flex; flex: 1; overflow: hidden; }
            .intel-sidebar { width: 320px; border-right: 1px solid #e0e0e0; overflow-y: auto; background: #f5f7f9; }
            .intel-content { flex: 1; overflow-y: auto; padding: 30px; background: #fff; }
            
          // Create an animated loading indicator.
            .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1a237e; border-radius: 50%; width: 35px; height: 35px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

            // Style search results and highlight the selected item.
            
            .search-item { padding: 15px; border-bottom: 1px solid #e0e0e0; cursor: pointer; transition: background 0.2s; }
            .search-item.active { background: #fff59d; border-left: 6px solid #1a237e; }
            .map-card { border: 1px solid #cfd8dc; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-top: 5px solid #1a237e; background: #fafafa; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
            .map-title { font-weight: bold; color: #1a237e; font-size: 14px; display: block; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px; text-transform: uppercase; }
            .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .info-box { background: #fff; padding: 8px; border-radius: 6px; border: 1px solid #e1e4e8; }
            .info-label { font-size: 9px; color: #78909c; font-weight: bold; display: block; text-transform: uppercase; }
            .info-val { font-size: 11px; font-weight: bold; color: #333; }
            .btn-nav { width: 100%; margin-top: 15px; padding: 12px; background: #1a237e; color: #ffffff !important; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; }
            .btn-nav:hover { background: #0d124a; }
            .action-bar { margin-top: 12px; display: flex; gap: 8px; }
            .btn-small { flex: 1; padding: 10px; font-size: 11px; border: 2px solid #1a237e; border-radius: 4px; background: #ffffff !important; color: #1a237e !important; cursor: pointer; font-weight: bold; text-align: center; display: block; }
            .btn-small:hover { background: #e8eaf6 !important; }
        `;
        
        // Add the plugin styles to the page.
    
        document.head.appendChild(style);
        
// Build the main plugin user interface.
    
        container.innerHTML = `
            <div class="intel-wrapper">
                <div class="intel-header">
                    <div style="font-weight:bold; font-size:20px;">Map Navigation Plugin 2.0</div>
                    
                    // Create a disabled search box until MINERVA data is loaded.
                    
                    <input type="text" id="intelInput" class="intel-search" placeholder="Search (e.g., TNF, STAT3)..." disabled>
                    
                </div>
                <div class="intel-body">
                    <div id="intelSidebar" class="intel-sidebar">
                        <div id="loading">
                            <div class="spinner"></div>
                            <p style="text-align:center; font-size:11px; color:#1a237e; font-weight:bold;">Please wait for a moment</p>
                        </div>
                    </div>
                    <div id="intelContent" class="intel-content"></div>
                </div>
            </div>
        `;
        
// Store all biological entities loaded from MINERVA.
        var allEntities = [];
        var modelDict = {}; 
        var sidebar = container.querySelector('#intelSidebar');
        var content = container.querySelector('#intelContent');
        var input = container.querySelector('#intelInput');
        
// Wait until both entities and models are loaded.
        Promise.all([
            minervaProxy.project.data.getAllBioEntities(), // Load all biological entities from the MINERVA project.
            minervaProxy.project.data.getModels() // Load all models and submaps from MINERVA.
        ]).then(function (results) { // Process the data after both MINERVA requests finish.
            allEntities = results[0]; // Save all loaded biological entities.
            results[1].forEach(function(m) { // Process every loaded MINERVA model.
                var mId = String(m.id || m._id || m.modelId);
                modelDict[mId] = m.name || m._name || "Submap layer"; // Map each model ID to its readable model name.
            });
            container.querySelector('#loading').style.display = 'none';
            input.disabled = false; // Enable searching after the data is ready.
        });

        input.oninput = function() { // Run the search whenever the user types.
            var val = this.value.toUpperCase();
            if (val.length < 2) return;
            var matches = []; var seen = new Set(); // Store matching entity search results.
            allEntities.forEach(e => { // Check every entity in the MINERVA project.
                if ((e.name || "").toUpperCase().indexOf(val) !== -1 && !seen.has(e.name)) {
                    matches.push(e); seen.add(e.name);
                }
            });
            sidebar.innerHTML = "";
            matches.slice(0, 30).forEach(item => {
                var div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<b>${item.name}</b><br><small style="color:#666;">${item._type || item.type}</small>`;
                div.onclick = function() {
                    sidebar.querySelectorAll('.active').forEach(a => a.classList.remove('active'));
                    div.classList.add('active');
                    showAnalysis(item.name);
                };
                sidebar.appendChild(div);
            });
        };

        function showAnalysis(name) {
            content.innerHTML = `<h2 style="color:#1a237e; border-bottom: 2px solid #ffd600; padding-bottom:10px;">Deep Audit: ${name}</h2>`;
            var instances = allEntities.filter(e => e.name === name);

            instances.forEach(occ => {
                var modelId = String(occ.modelId || occ._modelId);
                var mapName = modelDict[modelId] || "Submap " + modelId;
                var refs = occ.references || occ._references || [];
                var up = refs.find(r => (r.type || "").toUpperCase().includes("UNIPROT"));

                var card = document.createElement('div');
                card.className = 'map-card';
                card.innerHTML = `
                    <span class="map-title">${mapName}</span>
                    <div class="data-grid">
                        <div class="info-box"><span class="info-label">UniProt</span><span class="info-val">${up ? up.resource : 'N/A'}</span></div>
                        <div class="info-box"><span class="info-label">Type</span><span class="info-val">${occ._type || occ.type}</span></div>
                        <div class="info-box"><span class="info-label">Pos X</span><span class="info-val">${Math.round(occ.x)}</span></div>
                        <div class="info-box"><span class="info-label">Pos Y</span><span class="info-val">${Math.round(occ.y)}</span></div>
                    </div>
                    
                    <button class="btn-nav" id="zoom-${occ.id}">
                        📍 VIEW ON MAP (MAX ZOOM)
                    </button>

                    <div class="action-bar">
                        <button class="btn-small" onclick="window.open('https://www.uniprot.org/uniprotkb?query=${encodeURIComponent(name)}')">UniProt Search</button>
                        <button class="btn-small" onclick="window.open('https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(name)}')">PubMed Lit.</button>
                    </div>
                `;
                
                card.querySelector(`#zoom-${occ.id}`).onclick = function() {
                    var mId = parseInt(modelId);
                    minervaProxy.project.map.openMap({id: mId});
                    minervaProxy.project.map.setZoom({modelId: mId, zoom: 10});
                    minervaProxy.project.map.setCenter({
                        modelId: mId,
                        x: occ.x,
                        y: occ.y
                    });

                    minervaProxy.project.map.showBioEntity({
                        element: {id: occ.id, model: mId, type: 'ALIAS'},
                        type: 'SURFACE',
                        options: {color: '#ffd600', opacity: 0.5}
                    });
                };

                content.appendChild(card);
            });
        }
    };

    if (typeof minervaDefine === 'function') {
        minervaDefine(function () { return new AtlasIntelligence(); });
    }
}());
