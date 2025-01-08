import React from 'react';

function VideoSection() {
  return (
    <section id="inicio">
      <div className="inicio-container">
        <video id="mi-video" src="./img/shopping.mp4" muted autoPlay loop playsInline></video>
      </div>
      <a className="ca3-scroll-down-link ca3-scroll-down-arrow" data-ca3_iconfont="ETmodules" data-ca3_icon="" href="#gastos"></a>
    </section>
  );
}

export default VideoSection;