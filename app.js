// app.js - Bytexa Interactive 3D Scrolling Landing Page

// ================================================================
// EmailJS Configuration & Initialization
// NOTE: Public Key, Service ID, and Template ID are safe to expose
// in frontend code when secured via Domain Restrictions in EmailJS.
// ================================================================
const EMAILJS_PUBLIC_KEY = "-7vrpuUKlKyH_MbT7";
const EMAILJS_SERVICE_ID = "service_beel3jj";
const EMAILJS_TEMPLATE_ID = "template_xkql6tv";

(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // ================================================================
    // Navigation and Mobile Menu System
    // ================================================================
    const navbar = document.getElementById('navbar');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav-links a');
    const sections = document.querySelectorAll('.scroll-section');

    // Scroll listener for sticky navbar styling
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        highlightNav();
    });

    // Toggle Mobile Menu
    mobileMenuToggle.addEventListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
    });

    // Close menu when clicking links & smooth scroll
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            mobileMenuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
            document.body.style.overflow = 'auto';

            if (targetSection) {
                window.scrollTo({
                    top: targetSection.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Active Navigation Link Highlight
    function highlightNav() {
        let scrollPosition = window.scrollY + 120;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            
            if (scrollPosition >= top && scrollPosition < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // ================================================================
    // EmailJS Contact Form Handler
    // ================================================================
    const contactForm = document.getElementById('bytexa-contact-form');
    const submitBtn = document.getElementById('btn-submit');

    if (contactForm) {
        if (typeof emailjs !== 'undefined') {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'TRANSMITTING...';
                submitBtn.disabled = true;

                // Validate Google reCAPTCHA response
                const recaptchaResponse = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : '';
                if (!recaptchaResponse) {
                    alert("Please verify that you are not a robot by completing the reCAPTCHA.");
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                const formData = {
                    name: document.getElementById('form-name').value,
                    email: document.getElementById('form-email').value,
                    subject: document.getElementById('form-subject').value,
                    message: document.getElementById('form-message').value,
                    'g-recaptcha-response': recaptchaResponse
                };

                try {
                    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, formData);
                    
                    submitBtn.textContent = 'TRANSMITTED ✓';
                    submitBtn.style.background = 'linear-gradient(90deg, #10b981, #059669)';
                    submitBtn.style.color = '#ffffff';
                    contactForm.reset();
                    
                    // Reset reCAPTCHA for future submissions
                    if (typeof grecaptcha !== 'undefined') {
                        grecaptcha.reset();
                    }

                    setTimeout(() => {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        submitBtn.style.background = '';
                        submitBtn.style.color = '';
                    }, 4000);

                } catch (error) {
                    console.error('System Transmission Error:', error);
                    submitBtn.textContent = 'TRANSMISSION ERROR ✗';
                    submitBtn.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
                    submitBtn.style.color = '#ffffff';

                    // Reset reCAPTCHA on error so the user can retry
                    if (typeof grecaptcha !== 'undefined') {
                        grecaptcha.reset();
                    }

                    setTimeout(() => {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        submitBtn.style.background = '';
                        submitBtn.style.color = '';
                    }, 4000);
                }
            });
        } else {
            // Fallback if EmailJS SDK is blocked by browser ad-blockers or connection issues
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'SERVICE OFFLINE ✗';
                submitBtn.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
                submitBtn.style.color = '#ffffff';
                submitBtn.disabled = true;
                
                alert("The mailing service is currently offline or blocked by your browser's ad-blocker. Please email us directly at info@bytexa.net.");
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    submitBtn.style.background = '';
                    submitBtn.style.color = '';
                }, 6000);
            });
        }
    }

    // ================================================================
    // Three.js WebGL System (Procedural Node Grid & Force Field)
    // ================================================================
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    let scene, camera, renderer, nodesGeometry, nodesMaterial, nodesPoints;
    let connectionsGeometry, connectionsMaterial, connectionsLine;
    let packetsGroup, centerCore;
    
    let isMobile = window.innerWidth < 768;
    let particleCount = isMobile ? 45 : 80;
    let connectionDistance = isMobile ? 22 : 32;
    
    let nodes = [];
    const colors = {
        node: '#00f3ff',
        line: '#bc13fe',
        core: '#8b5cf6',
        packet: '#00f3ff'
    };
    
    // Global variables for tracking theme states
    let globalNodeColor = new THREE.Color(colors.node);
    let globalLineColor = new THREE.Color(colors.line);
    let globalCoreColor = new THREE.Color(colors.core);
    let globalPacketColor = new THREE.Color(colors.packet);
    let simulationSpeed = 1.0;

    // Mouse Tracking
    let mouse = new THREE.Vector2(-9999, -9999);
    let targetMouse = new THREE.Vector3();
    let raycaster = new THREE.Raycaster();
    let planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);



    // Canvas Point Texture Generator
    function createCircleTexture(colorStr) {
        const c = document.createElement('canvas');
        c.width = 64;
        c.height = 64;
        const ctx = c.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, colorStr);
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
    }

    // Initialize Three.js Scene
    function initWebGL() {
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x020202, 0.015);

        // Perspective Camera
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.set(0, 0, 65);

        // WebGL Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        // Ambient and Directional Lights for wireframes
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 30);
        scene.add(dirLight);

        // Populate Nodes
        nodesGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            // Distribute points in 3D volume
            let theta = Math.random() * Math.PI * 2;
            let phi = Math.acos((Math.random() * 2) - 1);
            let r = 25 + Math.random() * 45; // Shell distribution around core

            let x = r * Math.sin(phi) * Math.cos(theta);
            let y = r * Math.sin(phi) * Math.sin(theta);
            let z = r * Math.cos(phi) * 0.7; // Flatten slightly on Z

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            nodes.push({
                x: x, y: y, z: z,        // Original anchor positions
                cx: x, cy: y, cz: z,      // Current positions
                vx: 0, vy: 0, vz: 0,      // Velocities
                speed: 0.15 + Math.random() * 0.4,
                angleOffset: Math.random() * Math.PI * 2,
                size: Math.random() * 1.5 + 0.8
            });
        }

        nodesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Create Custom Shader-like point material
        nodesMaterial = new THREE.PointsMaterial({
            size: 2.2,
            vertexColors: false,
            color: globalNodeColor,
            map: createCircleTexture('#00f3ff'),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        nodesPoints = new THREE.Points(nodesGeometry, nodesMaterial);
        scene.add(nodesPoints);

        // Pipeline connection lines
        connectionsGeometry = new THREE.BufferGeometry();
        connectionsMaterial = new THREE.LineBasicMaterial({
            color: globalLineColor,
            transparent: true,
            opacity: 0.25,
            blending: THREE.AdditiveBlending
        });

        connectionsLine = new THREE.LineSegments(connectionsGeometry, connectionsMaterial);
        scene.add(connectionsLine);

        // Central Server Core mesh
        const coreGeometry = new THREE.IcosahedronGeometry(12, 1);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: globalCoreColor,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            blending: THREE.AdditiveBlending
        });
        centerCore = new THREE.Mesh(coreGeometry, coreMaterial);
        scene.add(centerCore);

        // Additional glowing core rings
        const ringGeo = new THREE.TorusGeometry(17, 0.3, 8, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: globalNodeColor,
            transparent: true,
            opacity: 0.25
        });
        const innerRing = new THREE.Mesh(ringGeo, ringMat);
        innerRing.rotation.x = Math.PI / 2;
        centerCore.add(innerRing);

        // Data Packets group
        packetsGroup = new THREE.Group();
        scene.add(packetsGroup);

        // Initialize dynamic connection indexes
        recalculateConnections();
        initPackets();
    }

    // Packet Pipeline particles
    let packets = [];
    function initPackets() {
        const packetGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const packetMat = new THREE.MeshBasicMaterial({
            color: globalPacketColor,
            transparent: true,
            opacity: 0.8
        });

        let maxPackets = isMobile ? 8 : 16;
        for (let i = 0; i < maxPackets; i++) {
            const mesh = new THREE.Mesh(packetGeo, packetMat);
            packetsGroup.add(mesh);
            packets.push({
                mesh: mesh,
                startNodeIdx: 0,
                endNodeIdx: 1,
                progress: Math.random(),
                speed: 0.005 + Math.random() * 0.015
            });
            assignPacketRoute(packets[i]);
        }
    }

    function assignPacketRoute(packet) {
        packet.startNodeIdx = Math.floor(Math.random() * particleCount);
        // Find nearest neighboring node as path endpoint
        let start = nodes[packet.startNodeIdx];
        let nearestIdx = (packet.startNodeIdx + 1) % particleCount;
        let minDist = 999999;
        
        // Randomly search 15 nodes for a neighbor
        for (let i = 0; i < 15; i++) {
            let next = Math.floor(Math.random() * particleCount);
            if (next === packet.startNodeIdx) continue;
            let d = distanceSq(start, nodes[next]);
            if (d < minDist) {
                minDist = d;
                nearestIdx = next;
            }
        }
        packet.endNodeIdx = nearestIdx;
        packet.progress = 0;
        packet.speed = (0.008 + Math.random() * 0.012) * simulationSpeed;
    }

    function distanceSq(a, b) {
        let dx = a.cx - b.cx;
        let dy = a.cy - b.cy;
        let dz = a.cz - b.cz;
        return dx * dx + dy * dy + dz * dz;
    }

    let linksList = [];
    function recalculateConnections() {
        linksList = [];
        const limitDistSq = connectionDistance * connectionDistance;
        const maxConnectionsPerNode = 3; // Limit connections per node to avoid dense overlapping lines
        
        const connectionCounts = new Array(particleCount).fill(0);
        
        for (let i = 0; i < particleCount; i++) {
            let candidates = [];
            for (let j = 0; j < particleCount; j++) {
                if (i === j) continue;
                let dSq = distanceSq(nodes[i], nodes[j]);
                if (dSq < limitDistSq) {
                    candidates.push({ index: j, distSq: dSq });
                }
            }
            
            // Sort neighbors by distance so we connect to the closest ones first
            candidates.sort((a, b) => a.distSq - b.distSq);
            
            for (let c = 0; c < candidates.length; c++) {
                if (connectionCounts[i] >= maxConnectionsPerNode) break;
                
                let targetIdx = candidates[c].index;
                if (connectionCounts[targetIdx] >= maxConnectionsPerNode) continue;
                
                // Avoid duplicating connection lines
                let lineExists = false;
                for (let l = 0; l < linksList.length; l += 2) {
                    if ((linksList[l] === i && linksList[l+1] === targetIdx) || 
                        (linksList[l] === targetIdx && linksList[l+1] === i)) {
                        lineExists = true;
                        break;
                    }
                }
                
                if (!lineExists) {
                    linksList.push(i, targetIdx);
                    connectionCounts[i]++;
                    connectionCounts[targetIdx]++;
                }
            }
        }

        const linkLinePositions = new Float32Array(linksList.length * 3);
        connectionsGeometry.setAttribute('position', new THREE.BufferAttribute(linkLinePositions, 3));
    }

    // Animation Loop
    function animateWebGL(time) {
        requestAnimationFrame(animateWebGL);
        


        const t = time * 0.001;

        // Perform raycasting to get mouse coordinates on Z-plane
        raycaster.setFromCamera(mouse, camera);
        raycaster.ray.intersectPlane(planeZ, targetMouse);

        // Update Particle Positions
        const positions = nodesGeometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
            let node = nodes[i];

            // 1. Gentle orbital floating motion
            let angle = t * node.speed + node.angleOffset;
            let floatX = Math.sin(angle) * 1.5;
            let floatY = Math.cos(angle * 0.8) * 1.5;
            
            let anchorX = node.x + floatX;
            let anchorY = node.y + floatY;
            let anchorZ = node.z;

            // 2. Mouse Repulsion force field
            let dx = node.cx - targetMouse.x;
            let dy = node.cy - targetMouse.y;
            let dz = node.cz - targetMouse.z;
            let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            let repulsionForceX = 0;
            let repulsionForceY = 0;
            let repulsionForceZ = 0;

            const repulseRadius = 15;
            if (dist < repulseRadius) {
                // Strong exponential push away
                let force = (repulseRadius - dist) / repulseRadius;
                let push = force * force * 1.8 * simulationSpeed;
                repulsionForceX = (dx / dist) * push;
                repulsionForceY = (dy / dist) * push;
                repulsionForceZ = (dz / dist) * push * 0.5;
            }

            // 3. Acceleration integration
            // Spring return to anchor
            let sax = (anchorX - node.cx) * 0.035;
            let say = (anchorY - node.cy) * 0.035;
            let saz = (anchorZ - node.cz) * 0.035;

            node.vx += sax + repulsionForceX;
            node.vy += say + repulsionForceY;
            node.vz += saz + repulsionForceZ;

            // Apply friction/drag
            node.vx *= 0.90;
            node.vy *= 0.90;
            node.vz *= 0.90;

            // Update coordinate values
            node.cx += node.vx;
            node.cy += node.vy;
            node.cz += node.vz;

            positions[i * 3] = node.cx;
            positions[i * 3 + 1] = node.cy;
            positions[i * 3 + 2] = node.cz;
        }
        nodesGeometry.attributes.position.needsUpdate = true;

        // Update Connections line segments positions
        if (linksList.length > 0) {
            const linePositions = connectionsGeometry.attributes.position.array;
            for (let k = 0; k < linksList.length; k++) {
                let nodeIdx = linksList[k];
                linePositions[k * 3] = nodes[nodeIdx].cx;
                linePositions[k * 3 + 1] = nodes[nodeIdx].cy;
                linePositions[k * 3 + 2] = nodes[nodeIdx].cz;
            }
            connectionsGeometry.attributes.position.needsUpdate = true;
        }

        // Update packet animations shooting through pipelines
        for (let p = 0; p < packets.length; p++) {
            let pk = packets[p];
            pk.progress += pk.speed;

            if (pk.progress >= 1.0) {
                assignPacketRoute(pk);
            } else {
                let startNode = nodes[pk.startNodeIdx];
                let endNode = nodes[pk.endNodeIdx];
                
                // Interpolate packet position
                pk.mesh.position.x = startNode.cx + (endNode.cx - startNode.cx) * pk.progress;
                pk.mesh.position.y = startNode.cy + (endNode.cy - startNode.cy) * pk.progress;
                pk.mesh.position.z = startNode.cz + (endNode.cz - startNode.cz) * pk.progress;
            }
        }

        // Animate central server core meshes
        centerCore.rotation.y += 0.005 * simulationSpeed;
        centerCore.rotation.x += 0.003 * simulationSpeed;

        // Render scene frame
        renderer.render(scene, camera);
    }

    // Capture global mouse movements
    window.addEventListener('mousemove', (e) => {
        // Convert screen coordinates to normalized WebGL coordinates (-1 to 1)
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Window resize handler
    window.addEventListener('resize', () => {
        isMobile = window.innerWidth < 768;
        
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Recalculate connection lines periodically
    setInterval(recalculateConnections, 2000);

    // ================================================================
    // GSAP ScrollTrigger Integration for Camera Path
    // ================================================================
    // Registers the ScrollTrigger plugin
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Create virtual object coordinates to animate in GSAP timeline
        // These coordinates will represent camera target coordinate values
        const scrollAnim = {
            camX: 0,
            camY: 0,
            camZ: 65,
            lookX: 0,
            lookY: 0,
            lookZ: 0,
            coreScale: 1.0,
            coreOpacity: 0.35
        };

        // Create main camera scroll animation timeline
        const camTl = gsap.timeline({
            scrollTrigger: {
                trigger: "#scroll-container",
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
                onUpdate: () => {
                    // Force WebGL camera lookAt target coordinates on every update
                    camera.position.set(scrollAnim.camX, scrollAnim.camY, scrollAnim.camZ);
                    camera.lookAt(scrollAnim.lookX, scrollAnim.lookY, scrollAnim.lookZ);
                    
                    if (centerCore) {
                        centerCore.scale.setScalar(scrollAnim.coreScale);
                        centerCore.material.opacity = scrollAnim.coreOpacity;
                    }
                }
            }
        });

        // Setup Timeline Keyframes (mapped across the 4 layout sections)
        camTl
            // --- Segment 1: Transitioning to About Section ---
            .to(scrollAnim, {
                camX: 20,
                camY: -10,
                camZ: 45,
                lookX: -5,
                lookY: 5,
                lookZ: 0,
                coreScale: 1.3,
                coreOpacity: 0.15,
                duration: 1,
                ease: "power2.inOut"
            })
            // --- Segment 2: Transitioning to Projects Section ---
            .to(scrollAnim, {
                camX: -35,
                camY: 15,
                camZ: 40,
                lookX: 5,
                lookY: -5,
                lookZ: -10,
                coreScale: 0.8,
                coreOpacity: 0.10,
                duration: 1,
                ease: "power2.inOut"
            })
            // --- Segment 3: Transitioning to Contact Section ---
            .to(scrollAnim, {
                camX: 0,
                camY: -28,
                camZ: 28,
                lookX: 0,
                lookY: 10,
                lookZ: 0,
                coreScale: 1.8,
                coreOpacity: 0.5,
                duration: 1,
                ease: "power2.inOut"
            });

        // 3D floating animation for text blocks
        // Smoothly float in the glass cards as they enter the screen viewport
        const textSections = document.querySelectorAll('.glass-card');
        textSections.forEach(card => {
            gsap.fromTo(card, 
                { opacity: 0, y: 100, scale: 0.95 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.8,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: card,
                        start: "top 80%",
                        end: "top 40%",
                        scrub: 1
                    }
                }
            );
        });

        // Unique animations for individual projects staggered in the grid
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => {
            gsap.fromTo(item,
                { opacity: 0, y: 60, scale: 0.96 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.6,
                    scrollTrigger: {
                        trigger: item,
                        start: "top 85%",
                        toggleActions: "play none none reverse"
                    }
                }
            );
        });
    }



    // Startup System
    initWebGL();
    animateWebGL(performance.now());

});
