// Initialize videoRefs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
  }, [slides.length]);
  
  // Preload next slide's video
  useEffect(() => {
    const nextIndex = (currentSlide + 1) % slides.length;
    const nextVideoId = slides[nextIndex].videoId;
    
    // Preload next video
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.href = `https://www.youtube.com/embed/${nextVideoId}`;
    preloadLink.as = 'iframe';
    document.head.appendChild(preloadLink);
    
    // Create a hidden iframe for the next video to start buffering
    const hiddenIframe = document.createElement('iframe');
    hiddenIframe.style.position = 'absolute';
    hiddenIframe.style.width = '1px';
    hiddenIframe.style.height = '1px';
    hiddenIframe.style.opacity = '0.01';
    hiddenIframe.style.zIndex = '-1000';
    hiddenIframe.style.pointerEvents = 'none';
    hiddenIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope';
    // Using a lower resolution to load faster
    hiddenIframe.src = `https://www.youtube.com/embed/${nextVideoId}?enablejsapi=1&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&vq=low`;
    document.body.appendChild(hiddenIframe);
    
    return () => {
      document.head.removeChild(preloadLink);
      document.body.removeChild(hiddenIframe);
    };
  }, [currentSlide, slides]);import React, { useState, useEffect, useRef } from 'react';

const AutoCarousel = () => {
  // Preload YouTube IFrame API as early as possible
  useEffect(() => {
    // Create script for YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    // Preload videos by creating image requests
    slides.forEach(slide => {
      const img = new Image();
      img.src = `https://img.youtube.com/vi/${slide.videoId}/maxresdefault.jpg`;
    });
  }, []);
  
  const slides = [
    {
      id: 1,
      title: 'Video 1',
      videoId: 'dQw4w9WgXcQ', // YouTube video ID
      bgColor: 'bg-blue-500'
    },
    {
      id: 2,
      title: 'Video 2',
      videoId: 'jNQXAC9IVRw', // YouTube video ID
      bgColor: 'bg-green-500'
    },
    {
      id: 3,
      title: 'Video 3',
      videoId: 'ZyhrYis509A', // YouTube video ID
      bgColor: 'bg-purple-500'
    },
    {
      id: 4,
      title: 'Video 4',
      videoId: 'FTQbiNvZqaY', // YouTube video ID
      bgColor: 'bg-red-500'
    }
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const progressInterval = useRef(null);
  const slideInterval = useRef(null);
  const videoRefs = useRef([]);

  // Toggle pause/play
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Function to play the current video and pause others
  const handleVideoPlayback = () => {
    // If paused, pause the current video too
    if (isPaused) {
      videoRefs.current.forEach((videoRef) => {
        if (videoRef && videoRef.contentWindow) {
          try {
            videoRef.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo' }),
              '*'
            );
          } catch (error) {
            console.error('Error controlling YouTube video:', error);
          }
        }
      });
      return;
    }
    
    // Otherwise, ensure the current video plays
    videoRefs.current.forEach((videoRef, index) => {
      if (videoRef && videoRef.contentWindow) {
        try {
          if (index === currentSlide) {
            // Play current slide video and seek to beginning
            videoRef.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'playVideo' }),
              '*'
            );
          } else {
            // Pause all other videos
            videoRef.contentWindow.postMessage(
              JSON.stringify({ event: 'command', func: 'pauseVideo' }),
              '*'
            );
          }
        } catch (error) {
          console.error('Error controlling YouTube video:', error);
        }
      }
    });
  };

  // Function to reset and start progress bar
  const startProgressBar = () => {
    // Don't start if paused
    if (isPaused) return;
    
    // Clear any existing interval
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    // Reset progress
    setProgress(0);
    
    // Set up new interval to update progress
    const startTime = Date.now();
    const duration = 5000; // 5 seconds in milliseconds
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(100, (elapsed / duration) * 100);
      setProgress(newProgress);
      
      // Clear interval when we reach 100%
      if (newProgress >= 100) {
        clearInterval(progressInterval.current);
      }
    }, 16); // Update roughly 60 times per second for smooth animation
  };

  // Auto-scroll effect
  useEffect(() => {
    // Start progress bar immediately when component mounts
    startProgressBar();
    
    // Control video playback when slide changes
    handleVideoPlayback();
    
    // Set up the interval
    const setupInterval = () => {
      // Clear any existing interval
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
      
      // Don't set a new interval if paused
      if (isPaused) return;
      
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prevSlide) => 
          prevSlide === slides.length - 1 ? 0 : prevSlide + 1
        );
        // Restart progress bar after slide changes
        startProgressBar();
      }, 5000); // 5 seconds interval
    };
    
    // Set up the interval initially
    setupInterval();
    
    // Clean up all intervals on component unmount
    return () => {
      clearInterval(slideInterval.current);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentSlide, slides.length, isPaused]);

  // Effect to handle pause state changes
  useEffect(() => {
    if (isPaused) {
      // Pause the interval and videos
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      handleVideoPlayback(); // Will pause videos
    } else {
      // Resume progress and interval
      startProgressBar();
      handleVideoPlayback(); // Will play current video
      
      // Set up the interval again
      slideInterval.current = setInterval(() => {
        setCurrentSlide((prevSlide) => 
          prevSlide === slides.length - 1 ? 0 : prevSlide + 1
        );
        startProgressBar();
      }, 5000);
    }
    
    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
    };
  }, [isPaused]);

  // Manual navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
    if (!isPaused) {
      startProgressBar(); // Reset progress bar on manual navigation
    }
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prevSlide) => 
      prevSlide === 0 ? slides.length - 1 : prevSlide - 1
    );
    if (!isPaused) {
      startProgressBar(); // Reset progress bar on manual navigation
    }
  };

  const goToNextSlide = () => {
    setCurrentSlide((prevSlide) => 
      prevSlide === slides.length - 1 ? 0 : prevSlide + 1
    );
    if (!isPaused) {
      startProgressBar(); // Reset progress bar on manual navigation
    }
  };
  
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-lg shadow-lg">
        {/* Preload videos */}
        {slides.map((slide, index) => (
          <link 
            key={`preload-${slide.id}`}
            rel="preload" 
            href={`https://www.youtube.com/embed/${slide.videoId}`} 
            as="document" 
          />
        ))}
        
        {/* Slides container */}
        <div 
          className="flex transition-transform duration-500 ease-in-out h-64" 
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div 
              key={slide.id} 
              className={`flex-shrink-0 w-full relative overflow-hidden ${slide.bgColor} h-64`}
            >
              <h2 className="text-2xl font-bold mb-2">{slide.title}</h2>
              <div className="w-full h-full absolute top-0 left-0 right-0 bottom-0">
                {/* Loading placeholder - shown while video loads */}
                <div 
                  className={`absolute inset-0 flex items-center justify-center bg-black z-10 transition-opacity duration-500 ${index === currentSlide ? 'opacity-0' : 'opacity-100'}`}
                  style={{ 
                    backgroundImage: `url(https://img.youtube.com/vi/${slide.videoId}/hqdefault.jpg)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {index === currentSlide && <div className="animate-pulse bg-white/10 w-16 h-16 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>}
                </div>
                
                {/* Actual YouTube iframe */}
                <iframe
                  ref={el => {
                    // Only replace the ref if we're in the visible slide
                    if (index === currentSlide) {
                      videoRefs.current[index] = el;
                    }
                  }}
                  className="w-full h-full absolute top-0 left-0 z-0"
                  src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&autoplay=${index === currentSlide && !isPaused ? 1 : 0}&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&playlist=${slide.videoId}`}
                  title={`YouTube video ${slide.title}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="eager"
                ></iframe>
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
        <div className="absolute bottom-4 left-4 right-16">
          <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Pause/Play Button */}
        <button
          className="absolute bottom-3 right-4 bg-white/30 hover:bg-white/50 text-white w-8 h-8 rounded-full flex items-center justify-center"
          onClick={togglePause}
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
