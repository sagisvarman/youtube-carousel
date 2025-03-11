import React, { useState, useEffect, useRef } from 'react';

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
  const progressInterval = useRef(null);
  const videoRefs = useRef([]);

  // Initialize videoRefs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
  }, [slides.length]);

  // Function to play the current video and pause others
  const handleVideoPlayback = () => {
    // Add a small delay to ensure iframe is properly loaded
    setTimeout(() => {
      videoRefs.current.forEach((videoRef, index) => {
        if (videoRef && videoRef.contentWindow) {
          try {
            if (index === currentSlide) {
              // Play current slide video and seek to beginning
              videoRef.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'playVideo' }),
                '*'
              );
              videoRef.contentWindow.postMessage(
                JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
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
    }, 50); // Small delay to ensure proper iframe loading
  };

  // Function to reset and start progress bar
  const startProgressBar = () => {
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
    
    const slideInterval = setInterval(() => {
      setCurrentSlide((prevSlide) => 
        prevSlide === slides.length - 1 ? 0 : prevSlide + 1
      );
      // Restart progress bar after slide changes
      startProgressBar();
    }, 5000); // 5 seconds interval

    // Clean up all intervals on component unmount
    return () => {
      clearInterval(slideInterval);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentSlide, slides.length]);

  // Manual navigation
  const goToSlide = (index) => {
    setCurrentSlide(index);
    startProgressBar(); // Reset progress bar on manual navigation
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prevSlide) => 
      prevSlide === 0 ? slides.length - 1 : prevSlide - 1
    );
    startProgressBar(); // Reset progress bar on manual navigation
  };

  const goToNextSlide = () => {
    setCurrentSlide((prevSlide) => 
      prevSlide === slides.length - 1 ? 0 : prevSlide + 1
    );
    startProgressBar(); // Reset progress bar on manual navigation
  };

  // Preload all videos when component mounts
  useEffect(() => {
    // Create hidden iframes to preload videos
    slides.forEach((slide) => {
      const preloadIframe = document.createElement('iframe');
      preloadIframe.style.display = 'none';
      preloadIframe.src = `https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&mute=1&controls=0&rel=0&playsinline=1`;
      document.body.appendChild(preloadIframe);
      
      // Clean up
      return () => {
        document.body.removeChild(preloadIframe);
      };
    });
  }, []);
  
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
                <iframe
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full absolute top-0 left-0"
                  src={`https://www.youtube.com/embed/${slide.videoId}?enablejsapi=1&autoplay=${index === currentSlide ? 1 : 0}&mute=1&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&playlist=${slide.videoId}`}
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
        <div className="absolute bottom-4 left-4 right-4">
          <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoCarousel;
