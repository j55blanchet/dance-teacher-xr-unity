AFRAME.registerComponent('avatar-controller', {
    init: function() {
        
        this.modelloaded = false;

        // once the modell is loaded, get access to the three.js object
        this.el.addEventListener('model-loaded', () => {
            // get the three.js object
            const model = this.el.getObject3D('mesh');

            this.model = model;
            
            this.pelvis = model.getObjectByName('lpBip_Pelvis_02');
            this.spine1 = model.getObjectByName('lpBip_Spine_03');
            this.spine2 = model.getObjectByName('lpBip_Spine1_04');
            this.neck = model.getObjectByName('lpBip_Neck_05');
            this.head = model.getObjectByName('lpBip_Head_06');
            this.lclavicle = model.getObjectByName('lpBip_L_Clavicle_08');
            this.lupperarm = model.getObjectByName('lpBip_L_UpperArm_09');
            this.lforearm = model.getObjectByName('lpBip_L_Forearm_010');
            this.lhand = model.getObjectByName('lpBip_L_Hand_011');
            this.rclavicle = model.getObjectByName('lpBip_R_Clavicle_018');
            this.rupperarm = model.getObjectByName('lpBip_R_UpperArm_019');
            this.rforearm = model.getObjectByName('lpBip_R_Forearm_020');
            this.rhand = model.getObjectByName('lpBip_R_Hand_021');
            this.lthigh = model.getObjectByName('lpBip_L_Thigh_027');
            this.lcalf = model.getObjectByName('lpBip_L_Calf_028');
            this.lfoot = model.getObjectByName('lpBip_L_Foot_029');
            this.ltoe = model.getObjectByName('lpBip_L_Toe0_030');
            this.rthigh = model.getObjectByName('lpBip_R_Thigh_032');
            this.rcalf = model.getObjectByName('lpBip_R_Calf_033');
            this.rfoot = model.getObjectByName('lpBip_R_Foot_034');
            this.rtoe = model.getObjectByName('lpBip_R_Toe0_035'); 

            this.modelloaded = true;
        });                
    },
    tick: function(time, timeDelta) {

        if (!this.modelloaded) return;

        const degreesPerSecond = 45;
        const radsPerSecond = THREE.MathUtils.degToRad(degreesPerSecond);
        const rotationAmount = radsPerSecond * timeDelta / 1000;

        // rotate the neck
        this.neck.rotateX(rotationAmount)
    }
});