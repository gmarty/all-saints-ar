const WIDTH = 480;
const HEIGHT = 360;

const width = Math.round(60 * WIDTH / HEIGHT);
const height = 60;

// Adjust camera frustum near and far clipping plane to match these distances.
const MIN_DETECTED_HEIGHT = 0.3; // At about 2.5m
const MAX_DETECTED_HEIGHT = 0.8; // At about 0.5m

const MAX_HALOS = 3;

AFRAME.registerComponent('all-saints-ar', {
  init: function() {
    const sceneEl = this.el;

    const video = document.createElement('video');
    sceneEl.insertAdjacentElement('beforebegin', video);

    const detector = new objectdetect.detector(width, height, 1.1, objectdetect.frontalface_alt);

    const halos = [];

    for (let i = 1; i <= MAX_HALOS; i++) {
      const halo = document.createElement('a-torus');
      halo.setAttribute('radius', '0.3');
      halo.setAttribute('radius-tubular', '0.03');
      halo.setAttribute('rotation', '90 0 0');
      halo.setAttribute('color', 'yellow');
      halo.setAttribute('visible', false);
      sceneEl.appendChild(halo);

      halos.push(halo);
    }

    this.video = video;
    this.detector = detector;
    this.halos = halos;

    if (navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: { width: WIDTH, height: HEIGHT },
        })
        .then((stream) => {
          const video = document.querySelector('video');
          video.srcObject = stream;
          video.onloadedmetadata = function() {
            video.play();
          };
        })
        .catch((err) => {
          console.log("The following error occurred: " + err.name);
        });
    }
  },

  tick: function() {
    const camera = this.el.camera;
    const coords = this.detector.detect(this.video, 1);

    // Hide all halos. This should be merged with the coords iteration code.
    this.halos.forEach((halo) => {
      halo.setAttribute('visible', false);
    });

    coords.forEach((coord, i) => {
      if (i >= MAX_HALOS) {
        return;
      }

      // Sometime the detection stops working.
      if (isNaN(coord[0])) {
        return;
      }

      const x = 2 * (coord[0] / width + coord[2] / width / 2) - 1;
      const y = 1 - 2 * ((coord[1] / height) - (coord[3] / height) / 2);

      // From -1 to 1 ; -1 = close ; 1 = far.
      // Clamp from -1 to 1 to avoid faces getting clipped out.
      const z = Math.max(
        -1,
        Math.min(
          1 - 2 * ((coord[3] / height) - MIN_DETECTED_HEIGHT) / (MAX_DETECTED_HEIGHT - MIN_DETECTED_HEIGHT),
          1)
      );

      const pos = new THREE.Vector3(x, y, z).unproject(camera);

      this.halos[i].setAttribute('position', pos);
      this.halos[i].setAttribute('visible', true);
    });
  },
});
