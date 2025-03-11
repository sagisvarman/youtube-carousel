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
  const [activeVideos, setActiveVideos] = useState([0]); // Track which videos are active/loaded
  const progressInterval = useRef(null);
  const slideInterval = useRef(null);
  const videoRefs = useRef([]);
  const pausedAt = useRef(0);
  const pausedTime = useRef(null);
  const slideDuration = 5000; // 5 seconds

  // Initialize refs
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
  }, [slides.length]);

  // Preload adjacent videos
  const preloadAdjacentVideos = useCallback(() => {
    // Calculate which videos should be active (current + next + previous)
    const nextSlide = (currentSlide + 1) % slides.length;
    const prevSlide = (currentSlide - 1 + slides.length) % slides.length;
    
    // Update active videos - this will cause them to load
    setActiveVideos([prevSlide, currentSlide, nextSlide]);
    
    // Mark current slide as loaded after a short delay to ensure it starts playing
    setTimeout(() => {
      setIsLoaded(prev => {
        const newLoaded = [...prev];
        newLoaded[currentSlide] = true;
        return newLoaded;
      });
    }, 100);
  }, [currentSlide, slides.length]);

  // Handle video iframe events
  const setupVideoListeners = useCallback(() => {
    // Function to handle messages from iframes
    const handleMessage = (event) => {
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
        const data = JSON.parse(event.data);
        
        // Handle player state changes
        if (data.event === "onStateChange") {
          // Video is playing (1) or buffering (3)
          if (data.info === 1 || data.info === 3) {
            // Find which iframe triggered this
            const index = videoRefs.current.findIndex(ref => {
              return ref && ref.contentWindow === event.source;
            });
            
            if (index !== -1) {
              // Mark as loaded
              setIsLoaded(prev => {
                const newLoaded = [...prev];
                newLoaded[index] = true;
                return newLoaded;
              });
            }
          }
        }
      } catch (e) {
        // Not a JSON message or parsing error
      }
    };

    // Add event listener
    window.addEventListener("message", handleMessage);
    
    // Return cleanup function
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Update active videos when slide changes
  useEffect(() => {
    preloadAdjacentVideos();
  }, [currentSlide, preloadAdjacentVideos]);

  // Set up message listener
  useEffect(() => {
    const cleanup = setupVideoListeners();
    return cleanup;
  }, [setupVideoListeners]);

  // Play current video and pause others
  const handleVideoPlayback = useCallback(() => {
    videoRefs.current.forEach((videoRef, index) => {
      if (!videoRef || !videoRef.contentWindow) return;
      
      try {
        if (index === currentSlide) {
          // Play and unmute current video
          videoRef.contentWindow.postMessage(
            JSON.stringify({ 
              event: 'command', 
              func: 'playVideo',
            }),
            '*'
          );
          
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
          
          // Keep other videos muted
          videoRef.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'mute' }),
            '*'
          );
        }
      } catch (error) {
        console.error('Error controlling video:', error);
      }
    });
  }, [currentSlide]);

  // Effect for video playback when slide changes
  useEffect(() => {
    // Short timeout to ensure iframe is ready
    const timer = setTimeout(() => {
      handleVideoPlayback();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [currentSlide, handleVideoPlayback]);

  // Progress bar management
  const startProgressBar = useCallback((startFromZero = false) => {
    if (isPaused) return;
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    const startTime = Date.now();
    let initialProgress = 0;
    
    if (!startFromZero && pausedAt.current > 0) {
      initialProgress = pausedAt.current;
    }
    
    setProgress(initialProgress);
    
    const elapsedTime = (initialProgress / 100) * slideDuration;
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime + elapsedTime;
      const newProgress = Math.min(100, (elapsed / slideDuration) * 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressInterval.current);
      }
    }, 16);
  }, [isPaused, slideDuration]);

  // Toggle pause state
  const togglePause = useCallback(() => {
    if (!isPaused) {
      // Pause - store current progress
      pausedAt.current = progress;
      pausedTime.current = Date.now();
      
      // Pause current video
      const videoRef = videoRefs.current[currentSlide];
      if (videoRef && videoRef.contentWindow) {
        videoRef.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'pauseVideo' }),
          '*'
        );
      }
    } else {
      // Resume - restart video
      const videoRef = videoRefs.current[currentSlide];
      if (videoRef && videoRef.contentWindow) {
        videoRef.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo' }),
          '*'
        );
      }
    }
    
    setIsPaused(prev => !prev);
  }, [progress, isPaused, currentSlide]);

  // Auto-scroll management
  useEffect(() => {
    // Clear any existing intervals
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
      slideInterval.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Only proceed if not paused
    if (!isPaused) {
      startProgressBar(false);
      
      const remainingPercent = 100 - pausedAt.current;
      const remainingTime = (remainingPercent / 100) * slideDuration;
      
      if (remainingTime > 0 && remainingTime < slideDuration) {
        // Handle remaining time for current slide
        const timeout = setTimeout(() => {
          const nextSlide = (currentSlide + 1) % slides.length;
          setCurrentSlide(nextSlide);
          pausedAt.current = 0;
          startProgressBar(true);
          
          // Set up regular interval
          slideInterval.current = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % slides.length);
            startProgressBar(true);
          }, slideDuration);
        }, remainingTime);
        
        // Return cleanup function
        return () => {
          clearTimeout(timeout);
          if (slideInterval.current) clearInterval(slideInterval.current);
          if (progressInterval.current) clearInterval(progressInterval.current);
        };
      } else {
        // Set up regular interval
        slideInterval.current = setInterval(() => {
          setCurrentSlide(prev => (prev + 1) % slides.length);
          startProgressBar(true);
        }, slideDuration);
      }
    }
    
    // Return cleanup function
    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPaused, slides.length, startProgressBar, currentSlide, slideDuration]);

  // Navigation functions
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    if (!isPaused) {
      pausedAt.current = 0;
      startProgressBar(true);
    }
  }, [isPaused, startProgressBar]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide(prev => prev === 0 ? slides.length - 1 : prev - 1);
    if (!isPaused) {
      pausedAt.current = 0;
      startProgressBar(true);
    }
  }, [isPaused, slides.length, startProgressBar]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
    if (!isPaused) {
      pausedAt.current = 0;
      startProgressBar(true);
    }
  }, [isPaused, slides.length, startProgressBar]);

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
                {/* Only render iframes for active videos to improve performance */}
                {activeVideos.includes(index) && (
                  <iframe
                    ref={el => videoRefs.current[index] = el}
                    className="w-full h-full absolute top-0 left-0"
                    src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&autoplay=${index === currentSlide ? '1' : '0'}&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&origin=${window.location.origin}&version=3`}
                    title={`YouTube video ${slide.title}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
                
                {/* Loading indicator */}
                {!isLoaded[index] && activeVideos.includes(index) && (
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
        
        {/* Pause/Play Button */}
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
