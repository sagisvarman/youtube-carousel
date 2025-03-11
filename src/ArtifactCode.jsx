import React, { useState, useEffect, useRef, useCallback } from 'react';

const AutoCarousel = () => {
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

  // Initialize videoRefs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
  }, [slides.length]);

  // Function to play the current video and pause others
  const handleVideoPlayback = useCallback(() => {
    videoRefs.current.forEach((videoRef, index) => {
      if (videoRef && videoRef.contentWindow) {
        try {
          if (index === currentSlide) {
            // Play current slide video
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
  }, [currentSlide]);

  // Function to reset and start progress bar
  const startProgressBar = useCallback(() => {
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
  }, [isPaused]);

  // Toggle pause/play
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

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
      // Start progress bar
      startProgressBar();
      
      // Set up auto-scroll interval
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
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPaused, slides.length, startProgressBar]);

  // Manual navigation
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    if (!isPaused) {
      startProgressBar(); // Reset progress bar on manual navigation
    }
  }, [isPaused, startProgressBar]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prevSlide) => 
      prevSlide === 0 ? slides.length - 1 : prevSlide - 1
    );
    if (!isPaused) {
      startProgressBar(); // Reset progress bar on manual navigation
    }
  }, [isPaused, slides.length, startProgressBar]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prevSlide) => 
      prevSlide === slides.length - 1 ? 0 : prevSlide + 1
    );
    if (!isPaused) {
      startProgressBar(); // Reset progress bar on manual navigation
    }
  }, [isPaused, slides.length, startProgressBar]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-lg shadow-lg">
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
              <div className="w-full h-full absolute top-0 left-0 right-0 bottom-0">
                <iframe
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full absolute top-0 left-0"
                  src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&autoplay=${index === currentSlide ? 1 : 0}&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0`}
                  title={`YouTube video ${slide.title}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
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
