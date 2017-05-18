$(function() {
	if (window.JpegCamera) {
		var camera; // Initialized at the end

		var update_stream_stats = function(stats) {
			$("#stream_stats").html(
				"Mean luminance = " + stats.mean +
				"; Standard Deviation = " + stats.std);

			//setTimeout(function() {camera.get_stats(update_stream_stats);}, 1000);
		};
		
		var $preview_box = $('#preview')[0],
			$preview_canvas = $('#preview_canvas')[0],
			$preview_cContext = $preview_canvas.getContext("2d"),
			$download_button = $('#download_picture')[0],
			$cancel_button = $('#cancel_download')[0],
			$download_link = $('#download_link')[0];
		$preview_cContext.imageSmoothingEnabled = false;
		$preview_cContext.imageSmoothingQuality = "high";
		
		if (!('filter' in $preview_cContext)){
			var message='You need to upgrade to eithor Chrome/Firefox for filters to work!';
			alert(message);
			$('.imgfilteroption').hide();
		} 
		$preview_canvas.dir = 'rtl';
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = '//fonts.googleapis.com/css?family=Arizonia';
		document.head.appendChild(link);
		var image = new Image();
		image.src = link.href;
		image.onerror = image.onload = function() {
			console.log('going...');
			$preview_cContext.fillStyle = "white";
			$preview_cContext.textBaseline = 'top'; 
			$preview_cContext.textAlign = 'center';
			$preview_cContext.font = '80px Arizonia';
			// Now, get the canvas ready to display the font:
			$preview_cContext.fillText('Example Text', $preview_canvas.width/2, 120);
			$preview_cContext.drawImage( $preview_canvas, 0, 0 );
			$preview_cContext.clearRect(0, 0, $preview_canvas.width, $preview_canvas.height);
		};
		
		var take_snapshots = function(count) {
			$preview_canvas.width = camera.video.videoWidth;
			$preview_canvas.height = camera.video.videoHeight;
			$preview_cContext.filter = '';
			$preview_cContext.translate($preview_canvas.width, 0);
			$preview_cContext.scale(-1, 1);
			$preview_cContext.imageSmoothingEnabled = true;
			$preview_cContext.drawImage(camera.video, 0, 0);
			$preview_cContext.imageSmoothingEnabled = false;
			var theImageData = $preview_cContext.getImageData(
				0, 0, $preview_canvas.width, $preview_canvas.height
			);
			$preview_cContext.scale(-1, 1);
			$preview_cContext.translate(-$preview_canvas.width, 0);
			//$preview_cContext.clearRect(0, 0, $preview_canvas.width, $preview_canvas.height);
			$preview_cContext.putImageData(theImageData, 0, 0);
			$($preview_box).fadeIn(250);
			$preview_box.className = "";
			$download_button.onclick = function(){
				$('#loading')[0].style.display = 'block';
				$preview_cContext.fillStyle = "white";
				$preview_cContext.textBaseline = 'top'; 
				$preview_cContext.textAlign = 'center';
				$preview_cContext.font = '80px Arizonia';
				var petsName = prompt(
					'What is your pets name?\n' + 
					'This text will be put at the top of the image ' + 
					'in a fancy font. ' + 
					'If you wish for your pet to remain anonymous '+
					'(which it totally fine), then leave this box empty.') || "";
				setTimeout(function(){
					$preview_cContext.filter = $preview_canvas.style.filter;
					$preview_cContext.drawImage( $preview_canvas, 0, 0 );
					$preview_cContext.fillText(petsName.trim(), $preview_canvas.width/2, 12);

					var proccessBlob = function(blob) {
						$download_link.href = URL.createObjectURL( blob );
						$download_link.download = petsName;
						$download_link.click();
						// free up memory & reset:
						//$preview_box.className = "hidden";
						$($preview_box).fadeOut(200);
						$preview_cContext.clearRect(0, 0, $preview_canvas.width, $preview_canvas.height);
						setTimeout(function(){
							$('#loading').css('display', 'none');
						}, 150);
					};

					//$preview_canvas.toBlob(proccessBlob, 'image/jpeg', 0.96);

					fetch($preview_canvas.toDataURL('image/jpeg', 0.95))
						.then(res => res.blob())
						.then( proccessBlob );

				}, 75); // Give the loading message time to appear
			}
			$cancel_button.onclick = function(){
				//$preview_box.className = "hidden";
				$($preview_box).fadeOut(250);
				// free up memory & reset:
				$preview_cContext.scale(-1, 1);
				$preview_cContext.translate(-$preview_canvas.width, 0);
				$preview_cContext.clearRect(0, 0, $preview_canvas.width, $preview_canvas.height);
			}
		};

		var add_snapshot = function(element) {
			$(element).data("snapshot", this).addClass("item");

			var $container = $("#snapshots").append(element);
			var $camera = $("#camera");
			var camera_ratio = $camera.innerWidth() / $camera.innerHeight();

			var height = $container.height()
			element.style.height = "" + height + "px";
			element.style.width = "" + Math.round(camera_ratio * height) + "px";

			var scroll = $container[0].scrollWidth - $container.innerWidth();

			$container.animate({
				scrollLeft: scroll
			}, 200);
		};

		var select_snapshot = function () {
			$(".item").removeClass("selected");
			var snapshot = $(this).addClass("selected").data("snapshot");
			$("#discard_snapshot, #upload_snapshot, #api_url").show();
			snapshot.show();
			$("#show_stream").show();
		};

		var clear_upload_data = function() {
			$("#upload_status, #upload_result").html("");
		};

		var upload_snapshot = function() {
			var api_url = $("#api_url").val();

			if (!api_url.length) {
				$("#upload_status").html("Please provide URL for the upload");
				return;
			}

			clear_upload_data();
			$("#loader").show();
			$("#upload_snapshot").prop("disabled", true);

			var snapshot = $(".item.selected").data("snapshot");
			snapshot.upload({api_url: api_url}).done(upload_done).fail(upload_fail);
		};

		var upload_done = function(response) {
			$("#upload_snapshot").prop("disabled", false);
			$("#loader").hide();
			$("#upload_status").html("Upload successful");
			$("#upload_result").html(response);
		};

		var upload_fail = function(code, error, response) {
			$("#upload_snapshot").prop("disabled", false);
			$("#loader").hide();
			$("#upload_status").html(
				"Upload failed with status " + code + " (" + error + ")");
			$("#upload_result").html(response);
		};

		var discard_snapshot = function() {
			var element = $(".item.selected").removeClass("item selected");

			var next = element.nextAll(".item").first();

			if (!next.size()) {
				next = element.prevAll(".item").first();
			}

			if (next.size()) {
				next.addClass("selected");
				next.data("snapshot").show();
			}
			else {
				hide_snapshot_controls();
			}

			element.data("snapshot").discard();

			element.hide("slow", function() {$(this).remove()});
		};

		var show_stream = function() {
			$(this).hide();
			$(".item").removeClass("selected");
			hide_snapshot_controls();
			clear_upload_data();
			camera.show_stream();
		};

		var hide_snapshot_controls = function() {
			$("#discard_snapshot, #upload_snapshot, #api_url").hide();
			$("#upload_result, #upload_status").html("");
			$("#show_stream").hide();
		};

		function takePic(evt){
			if (performance.now()>((window.lastclick||0)+50))
				take_snapshots(1);
		};
		$("#take_snapshots,body").on('touchstart', takePic)
			.click(	takePic );
		$("#snapshots").on("click", ".item", select_snapshot);
		$("#upload_snapshot").click(upload_snapshot);
		$("#discard_snapshot").click(discard_snapshot);
		$("#show_stream").click(show_stream);

		var options = {
			shutter_ogg_url: "../dist/shutter.ogg",
			shutter_mp3_url: "../dist/shutter.mp3",
			swf_url: "../dist/jpeg_camera.swf"
		}

		camera = new JpegCamera("#camera", options).ready(function(info) {
			$('video').removeAttr('style');
			$('video').css('pointer-events', 'none');
			$("#take_snapshots").show();

			$("#camera_info").html(
				"Camera resolution: " + info.video_width + "x" + info.video_height
			);
			
			var brightness="100", sepia="0", contrast="100", saturation="100", updateFilters = function(){
				var filterCSS = 'brightness(' + brightness + '%) ' +
					'sepia(' + sepia + '%) ' +
					'contrast(' + contrast + '%) ' +
					'saturate(' + saturation + '%)';
				$('video').attr('style', 'filter: ' + filterCSS);
				$preview_canvas.style.filter = filterCSS;
			};
			$('#brightness').on('input', function(){ brightness = this.value.toString(); updateFilters(); } );
			$('#sepia').on('input', function(){ sepia = this.value.toString(); updateFilters(); } );
			$('#contrast').on('input', function(){ contrast = this.value.toString(); updateFilters(); } );
			$('#saturation').on('input', function(){ saturation = this.value.toString(); updateFilters(); } );
			$('#resetOptions').on('click', function(){
				brightness = $('#brightness')[0].value = '100';
				sepia = $('#sepia')[0].value = '0';
				contrast = $('#contrast')[0].value = '100';
				saturation = $('#saturation')[0].value = '100';
				updateFilters();
			});
			
			if (Math.max(info.video_width,info.video_height)<1120 || 
			    Math.min(info.video_width,info.video_height)<630){
				alert("Your deveice's camera has a resolution of " + 
				      info.video_width + "X" + info.video_height + 
				      ". The images you take with this camera will" + 
				      "not count because they are too low resolution.");
			}
			if (Math.min(info.video_width, info.video_height)>=1920 && 
			    Math.min(info.video_width, info.video_height)>=1080){
				alert("Your deveice's camera has a resolution of " + 
				      info.video_width + "x" + info.video_height + 
				      "! The images you take with this camera will" + 
				      "be shown 2x as much because they are so high quality.");
			}
		});
		var requestFS = $('#rfs');
		requestFS.on('click', function(){
			var el = document.documentElement;
			(el.requestFullscreen || el.webkitRequestFullScreen
			 || el.mozRequestFullScreen || el.msRequestFullscreen).call(el);
			setTimeout(function(){ $('#rfs').css('cursor', 'initial'); }, 75);
		});
		document.addEventListener('webkitfullscreenchange', exitHandler, false);
		document.addEventListener('mozfullscreenchange', exitHandler, false);
		document.addEventListener('fullscreenchange', exitHandler, false);
		document.addEventListener('MSFullscreenChange', exitHandler, false);

		function exitHandler() {
			if (document.webkitFullscreenElement ||  document.FullscreenElement
			     || document.webkitIsFullScreen || document.mozFullScreen !== null) {
				$('#rfs').css('cursor', 'pointer');
			}
		}
		$('*:not(body)').click(funciton(){
			evt.stopPropagation();
			window.lastclick = performance.now();
		})
	}
});
