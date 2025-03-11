import React, { useState, useEffect, useRef, useCallback } from 'react';

const AutoCarousel = () => {
  const slides = [
    {
      id: 1,
      title: 'Video 1',
      videoId: 'dQw4w9WgXcQ' // YouTube video ID
    },
    {
      id: 2,
      title: 'Video 2',
      videoId: 'jNQXAC9IVRw' // YouTube video ID
    },
    {
      id: 3,
      title: 'Video 3',
      videoId: 'ZyhrYis509A' // YouTube video ID
    },
    {
      id: 4,
      title: 'Video 4',
      videoId: 'FTQbiNvZqaY' // YouTube video ID
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoaded, setIsLoaded] = useState(Array(slides.length).fill(false));
  const progressInterval = useRef(null);
  const slideInterval = useRef(null);
  const videoRefs = useRef([]);
  const pausedAt = useRef(0);
  const pausedTime = useRef(null);
  const preloadDistance = 1; // How many videos to preload ahead

  // Initialize videoRefs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
  }, [slides.length]);

  // Function to preload videos
  const preloadVideos = useCallback(() => {
    // Determine which videos should be preloaded
    for (let i = 0; i < slides.length; i++) {
      // Calculate distance from current slide (handle circular distance)
      const distance = Math.min(
        (i - currentSlide + slides.length) % slides.length,
        (currentSlide - i + slides.length) % slides.length
      );
      
      // Preload current and nearby videos
      if (distance <= preloadDistance && videoRefs.current[i]) {
        const iframe = videoRefs.current[i];
        
        // Set to high quality but muted until it becomes current
        if (iframe.contentWindow) {
          try {
            // If not already loaded, set it up
            if (!isLoaded[i]) {
              iframe.contentWindow.postMessage(
                JSON.stringify({ 
                  event: 'command', 
                  func: 'loadVideoById', 
                  args: [slides[i].videoId, 0, 'hd720']
                }),
                '*'
              );
              
              // Mark as loaded
              setIsLoaded(prev => {
                const newLoaded = [...prev];
                newLoaded[i] = true;
                return newLoaded;
              });
              
              // Immediately pause if not current slide
              if (i !== currentSlide) {
                iframe.contentWindow.postMessage(
                  JSON.stringify({ event: 'command', func: 'pauseVideo' }),
                  '*'
                );
              }
            }
          } catch (error) {
            console.error('Error preloading video:', error);
          }
        }
      }
    }
  }, [currentSlide, isLoaded, slides]);

  // Function to play the current video and pause others
  const handleVideoPlayback = useCallback(() => {
    videoRefs.current.forEach((videoRef, index) => {
      if (videoRef && videoRef.contentWindow) {
        try {
          if (index === currentSlide) {
            // Play current slide video
            videoRef.contentWindow.postMessage(
              JSON.stringify({ 
                event: 'command', 
                func: 'playVideo',
              }),
              '*'
            );
            
            // Unmute current video
            videoRef.contentWindow.postMessage(
              JSON.stringify({ 
                event: 'command', 
                func: 'unMute',
              }),
              '*'
            );
          } else {
            // Pause all other videos
            videoRef.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo' }),
              '*'
            );
            
            // Mute other videos
            videoRef.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'mute' }),
              '*'
            );
          }
        } catch (error) {
          console.error('Error controlling YouTube video:', error);
        }
      }
    });
  }, [currentSlide]);

  // Function to reset and start progress bar
  const startProgressBar = useCallback((startFromZero = false) => {
    // Don't start if paused
    if (isPaused) return;
    
    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    // Get start time and initial progress
    const startTime = Date.now();
    let initialProgress = 0;
    
    // If we're resuming (not starting from zero), use the saved progress
    if (!startFromZero && pausedAt.current > 0) {
      initialProgress = pausedAt.current;
      setProgress(initialProgress);
    } else {
      // Otherwise reset progress
      setProgress(0);
    }
    
    const duration = 5000; // 5 seconds in milliseconds
    const elapsedTime = (initialProgress / 100) * duration;
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime + elapsedTime;
      const newProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(newProgress);
      
      // Clear interval when we reach 100%
      if (newProgress >= 100) {
        clearInterval(progressInterval.current);
      }
    }, 16); // Update roughly 60 times per second for smooth animation
  }, [isPaused]);

  // Toggle pause/play
  const togglePause = useCallback(() => {
    if (!isPaused) {
      // If we're pausing, store the current progress and timestamp
      pausedAt.current = progress;
      pausedTime.current = Date.now();
      
      // Pause the current video when carousel is paused
      if (videoRefs.current[currentSlide] && videoRefs.current[currentSlide].contentWindow) {
        videoRefs.current[currentSlide].contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo' }),
          '*'
        );
      }
    } else {
      // Resume the current video when carousel is resumed
      if (videoRefs.current[currentSlide] && videoRefs.current[currentSlide].contentWindow) {
        videoRefs.current[currentSlide].contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo' }),
          '*'
        );
      }
    }
    
    setIsPaused(prev => !prev);
  }, [progress, isPaused, currentSlide]);

  // Effect to preload videos when currentSlide changes
  useEffect(() => {
    preloadVideos();
  }, [currentSlide, preloadVideos]);

  // Effect to handle video playback when slide changes
  useEffect(() => {
    handleVideoPlayback();
  }, [currentSlide, handleVideoPlayback]);

  // Effect to handle pause state changes
  useEffect(() => {
    // Clear any existing intervals first
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
      slideInterval.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Only set up intervals if NOT paused
    if (!isPaused) {
      // Start progress bar from saved position if available
      startProgressBar(false); // false means don't start from zero
      
      // Calculate remaining time for this slide
      const remainingPercent = 100 - pausedAt.current;
      const totalDuration = 5000; // 5 seconds
      const remainingTime = (remainingPercent / 100) * totalDuration;
      
      // Set up auto-scroll interval with the remaining time for the first cycle
      if (remainingTime > 0 && remainingTime < totalDuration) {
        // First, set a one-time timeout for the remaining time
        const timeout = setTimeout(() => {
          // Preload the next slide before moving to it
          const nextSlide = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
          
          // Move to next slide when the remaining time is up
          setCurrentSlide(nextSlide);
          
          // Reset progress and start a normal interval
          pausedAt.current = 0;
          startProgressBar(true);
          
          // Then set up the regular interval
          slideInterval.current = setInterval(() => {
            const nextSlide = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
            setCurrentSlide(nextSlide);
            startProgressBar(true);
          }, totalDuration);
        }, remainingTime);
        
        // Store the timeout ID for cleanup
        return () => {
          clearTimeout(timeout);
          if (slideInterval.current) clearInterval(slideInterval.current);
          if (progressInterval.current) clearInterval(progressInterval.current);
        };
      } else {
        // If we don't have a valid remaining time, start normal interval
        slideInterval.current = setInterval(() => {
          const nextSlide = currentSlide === slides.length - 1 ? 0 : currentSlide + 1;
          setCurrentSlide(nextSlide);
          startProgressBar(true);
        }, totalDuration);
      }
    }
    
    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPaused, slides.length, startProgressBar, currentSlide]);

  // Manual navigation
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    if (!isPaused) {
      pausedAt.current = 0; // Reset saved progress
      startProgressBar(true); // Start from beginning for manual navigation
    }
  }, [isPaused, startProgressBar]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prevSlide) => 
      prevSlide === 0 ? slides.length - 1 : prevSlide - 1
    );
    if (!isPaused) {
      pausedAt.current = 0; // Reset saved progress
      startProgressBar(true); // Start from beginning for manual navigation
    }
  }, [isPaused, slides.length, startProgressBar]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prevSlide) => 
      prevSlide === slides.length - 1 ? 0 : prevSlide + 1
    );
    if (!isPaused) {
      pausedAt.current = 0; // Reset saved progress
      startProgressBar(true); // Start from beginning for manual navigation
    }
  }, [isPaused, slides.length, startProgressBar]);

  // Handler for iframe messages (to know when videos are ready)
  useEffect(() => {
    const handleIframeMessages = (event) => {
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Handle player state changes
        if (data.event === "onStateChange") {
          // Video is ready (buffering finished)
          if (data.info === 1) {
            // Video started playing
            console.log("Video started playing");
          }
        }
      } catch (e) {
        // Not a JSON message or parsing error
      }
    };

    window.addEventListener("message", handleIframeMessages);
    return () => {
      window.removeEventListener("message", handleIframeMessages);
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        {/* Slides container */}
        <div 
          className="flex transition-transform duration-500 ease-out h-64" 
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div 
              key={slide.id} 
              className="flex-shrink-0 w-full relative overflow-hidden h-64"
            >
              <div className="w-full h-full absolute top-0 left-0 right-0 bottom-0 bg-black">
                <iframe
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full absolute top-0 left-0"
                  src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&autoplay=${index === currentSlide ? '1' : '0'}&mute=${index === currentSlide ? '0' : '1'}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&origin=${window.location.origin}`}
                  title={`YouTube video ${slide.title}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                
                {/* Loading indicator - shows only when video isn't loaded yet */}
                {!isLoaded[index] && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button 
          className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-2 rounded-full"
          onClick={goToPrevSlide}
        >
          ←
        </button>
        <button 
          className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-2 rounded-full"
          onClick={goToNextSlide}
        >
          →
        </button>

        {/* Dots navigation */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`h-3 w-3 rounded-full ${
                currentSlide === index ? 'bg-white' : 'bg-white/50'
              }`}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
        
        {/* Progress bar */}
        <div className="absolute bottom-4 left-12 right-4">
          <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Pause/Play Button for carousel auto-scroll */}
        <button
          className="absolute bottom-3 left-4 bg-white/30 hover:bg-white/50 text-white w-8 h-8 rounded-full flex items-center justify-center"
          onClick={togglePause}
          title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
        >
          {isPaused ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default AutoCarousel;
