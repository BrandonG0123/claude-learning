(function(){ const TN=window.TN; const {W,H,PAL,E}=TN; TN.scenes=TN.scenes||{};
TN.scenes.scene1={ render(ctx,t){
  TN.bgGradient(ctx,PAL.bg2,PAL.bg);
  // perspective court
  const cam=TN.Camera.orbit([0,0,0], 0.0+Math.sin(t*0.5)*0.4, 0.55, 34, 42);
  TN.drawSurface(ctx,cam,{light:0.3}); TN.drawLines(ctx,cam,{progress:TN.prog(t,0,2),order:'sequence',glow:8}); TN.drawNet(ctx,cam);
  // flying ball along a serve path with ground shadow
  const T=1.1; const u=(t%T)/T; const p0=[-1,-11.5,2.8], p1=[2.5,5.5,0]; const v=TN.solveVelocity(p0,p1,T); const pos=TN.ballistic(p0,v,u*T);
  TN.drawGroundShadow(ctx,cam,pos[0],pos[1],pos[2]); const s=cam.project(pos); const r=s.scale*TN.COURT.ballR*3;
  TN.drawBall(ctx,s.x,s.y,r,{rot:[t*9,t*4,0]});
  // hero ball + racket + text
  TN.drawRacket(ctx,1500,560,{angle:-0.6+Math.sin(t)*0.2,scale:0.8,deform:0.6,hitX:0.1,hitY:-0.1});
  TN.drawBall(ctx,420,560,180,{rot:[t*2,0.3,t],squash:0.08*Math.abs(Math.sin(t*3)),squashAngle:0.7});
  TN.kinetic(ctx,'MATCH POINT',W/2,240,{t,t0:0.3,size:220,anim:TN.ANIM.slam,color:PAL.ball,spacing:4});
  TN.tag(ctx,'SERVE SPEED  213 KM/H',120,980,{p:TN.prog(t,0.5,1.2)});
  TN.rollingNumber(ctx,213,1700,980,TN.prog(t,0.5,2),{size:120,align:'right',color:'#fff'});
  TN.burst(ctx,t,{x:960,y:760,t0:1.0,count:120,colors:[PAL.ball,'#fff',PAL.accent2],shape:'streak',speed:[300,1200]});
  TN.shockRing(ctx,960,760,(t-1.0)*1400,30,'#fff',TN.decay(t,1.0,0.3),0.35);
  TN.lensFlare(ctx,1650,180,0.6+0.3*Math.sin(t*2));
  TN.speedLines(ctx,W/2,H/2,TN.impulse(t-1.0,6)*0.8);
  TN.motes(ctx,t,{count:80});
  TN.scanlines(ctx,0.05);
}}; })();
