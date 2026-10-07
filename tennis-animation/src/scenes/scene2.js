(function(){ const TN=window.TN; const {W,H,PAL}=TN; TN.scenes=TN.scenes||{};
TN.scenes.scene2={ render(ctx,t){
  TN.bgGradient(ctx,'#101c30','#04080f',{cx:1300,cy:300,r:1400});
  // macro ball, strong key light from upper-right, rim from lower-left
  TN.drawBall(ctx,700,540,430,{rot:[0.9+t*0.6,0.4,0.2],light:[0.55,-0.75],rim:0.8,fuzz:1});
  TN.drawRacket(ctx,1500,520,{angle:0.35,scale:1.1,deform:0.9,hitX:-0.2,hitY:0.1});
  TN.text(ctx,'HERO ASSET CHECK',W/2,1020,{size:48,family:TN.FONTS.mono,weight:700,color:PAL.mute,spacing:6});
}}; })();
