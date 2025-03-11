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
  const [playerReady, setPlayerReady] = useState(Array(slides.length).fill(false));
  const progressInterval = useRef(null);
  const slideInterval = useRef(null);
  const videoRefs = useRef([]);
  const playerRefs = useRef([]);
  const pausedAt = useRef(0);
  const pausedTime = useRef(null);
  const preloadDistance = 2; // Increased: preload 2 videos ahead and behind
  const slideDuration = 5000; // 5 seconds per slide

  // Initialize refs arrays
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, slides.length);
    playerRefs.current = Array(slides.length).fill(null);
  }, [slides.length]);

  // Initialize YouTube API
  useEffect(() => {
    // Create YouTube API script
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Setup callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      // Initialize players when API is ready
      initPlayers();
    };

    // Initialize players if API is already loaded
    if (window.YT && window.YT.Player) {
      initPlayers();
    }

    return () => {
      // Cleanup players on unmount
      playerRefs.current.forEach(player => {
        if (player) {
          try {
            player.destroy();
          } catch (e) {
            console.error('Error destroying player:', e);
          }
        }
      });
    };
  }, []);

  // Initialize YouTube players
  const initPlayers = useCallback(() => {
    if (!window.YT || !window.YT.Player) return;

    slides.forEach((slide, index) => {
      // Skip if player already initialized
      if (playerRefs.current[index]) return;

      const container = videoRefs.current[index];
      if (!container) return;

      try {
        // Create player
        const player = new window.YT.Player(container, {
          videoId: slide.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            mute: 1,
            loop: 0,
          },
          events: {
            onReady: (event) => {
              playerRefs.current[index] = event.target;
              // Set high quality
              event.target.setPlaybackQuality('hd720');
              
              // Always cue video rather than loading it right away
              event.target.cueVideoById(slide.videoId);
              
              // Mark player as ready
              setPlayerReady(prev => {
                const newReady = [...prev];
                newReady[index] = true;
                return newReady;
              });
              
              // If this is the first slide, start preloading now
              if (index === currentSlide) {
                preloadVideo(index);
              }
              
              // Preload nearby videos based on preloadDistance
              for (let i = 1; i <= preloadDistance; i++) {
                const nextIndex = (index + i) % slides.length;
                const prevIndex = (index - i + slides.length) % slides.length;
                preloadVideo(nextIndex);
                preloadVideo(prevIndex);
              }
            },
            onStateChange: (event) => {
              // When buffer is ready and video can play
              if (event.data === window.YT.PlayerState.BUFFERING || 
                  event.data === window.YT.PlayerState.PLAYING) {
                setIsLoaded(prev => {
                  const newLoaded = [...prev];
                  newLoaded[index] = true;
                  return newLoaded;
                });
              }
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    });
  }, [slides, currentSlide, preloadDistance]);

  // Preload a specific video
  const preloadVideo = useCallback((index) => {
    const player = playerRefs.current[index];
    if (!player || !playerReady[index]) return;
    
    try {
      // Load video but keep it paused
      player.cueVideoById({
        videoId: slides[index].videoId,
        startSeconds: 0,
        suggestedQuality: 'hd720'
      });
      
      // Mute non-current videos to allow preloading on mobile
      if (index !== currentSlide) {
        player.mute();
      }
    } catch (error) {
      console.error(`Error preloading video ${index}:`, error);
    }
  }, [slides, currentSlide, playerReady]);

  // Function to actively preload videos based on current position
  const preloadVideos = useCallback(() => {
    // Preload the next few videos
    for (let i = 1; i <= preloadDistance; i++) {
      const nextIndex = (currentSlide + i) % slides.length;
      const prevIndex = (currentSlide - i + slides.length) % slides.length;
      
      // Preload next and previous videos
      preloadVideo(nextIndex);
      preloadVideo(prevIndex);
    }
  }, [currentSlide, preloadDistance, preloadVideo, slides.length]);

  // Handle video playback when slides change
  const handleVideoPlayback = useCallback(() => {
    playerRefs.current.forEach((player, index) => {
      if (!player || !playerReady[index]) return;
      
      try {
        if (index === currentSlide) {
          // Play and unmute current video
          player.seekTo(0);
          player.unMute();
          player.playVideo();
        } else {
          // Pause other videos but keep them buffered
          player.pauseVideo();
          player.mute();
        }
      } catch (error) {
        console.error(`Error controlling video ${index}:`, error);
      }
    });
  }, [currentSlide, playerReady]);

  // Start progress bar animation
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
    }, 16); // ~60fps updates
  }, [isPaused, slideDuration]);

  // Toggle pause/play state
  const togglePause = useCallback(() => {
    if (!isPaused) {
      pausedAt.current = progress;
      pausedTime.current = Date.now();
      
      // Pause current video when carousel is paused
      const currentPlayer = playerRefs.current[currentSlide];
      if (currentPlayer && playerReady[currentSlide]) {
        currentPlayer.pauseVideo();
      }
    } else {
      // Resume video playback when carousel is resumed
      const currentPlayer = playerRefs.current[currentSlide];
      if (currentPlayer && playerReady[currentSlide]) {
        currentPlayer.playVideo();
      }
    }
    
    setIsPaused(prev => !prev);
  }, [progress, isPaused, currentSlide, playerReady]);

  // Effect to preload videos when currentSlide changes
  useEffect(() => {
    preloadVideos();
  }, [currentSlide, preloadVideos]);

  // Effect to handle video playback when slide changes
  useEffect(() => {
    handleVideoPlayback();
  }, [currentSlide, handleVideoPlayback]);

  // Manage auto-scroll and progress bar
  useEffect(() => {
    // Clear existing intervals
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
      slideInterval.current = null;
    }
    
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    
    // Only run if not paused
    if (!isPaused) {
      startProgressBar(false);
      
      // Calculate remaining time
      const remainingPercent = 100 - pausedAt.current;
      const remainingTime = (remainingPercent / 100) * slideDuration;
      
      if (remainingTime > 0 && remainingTime < slideDuration) {
        // First timeout for remaining time of current slide
        const timeout = setTimeout(() => {
          const nextSlide = (currentSlide + 1) % slides.length;
          
          // Preload next slide's next slide before transition
          const nextNextSlide = (nextSlide + 1) % slides.length;
          preloadVideo(nextNextSlide);
          
          // Move to next slide
          setCurrentSlide(nextSlide);
          pausedAt.current = 0;
          startProgressBar(true);
          
          // Then set regular interval
          slideInterval.current = setInterval(() => {
            setCurrentSlide(prevSlide => {
              const next = (prevSlide + 1) % slides.length;
              return next;
            });
            startProgressBar(true);
          }, slideDuration);
        }, remainingTime);
        
        return () => {
          clearTimeout(timeout);
          if (slideInterval.current) clearInterval(slideInterval.current);
          if (progressInterval.current) clearInterval(progressInterval.current);
        };
      } else {
        // Start normal interval
        slideInterval.current = setInterval(() => {
          setCurrentSlide(prevSlide => {
            const next = (prevSlide + 1) % slides.length;
            return next;
          });
          startProgressBar(true);
        }, slideDuration);
      }
    }
    
    return () => {
      if (slideInterval.current) clearInterval(slideInterval.current);
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPaused, slides.length, startProgressBar, currentSlide, preloadVideo, slideDuration]);

  // Manual navigation
  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
    if (!isPaused) {
      pausedAt.current = 0;
      startProgressBar(true);
    }
  }, [isPaused, startProgressBar]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlide((prevSlide) => 
      prevSlide === 0 ? slides.length - 1 : prevSlide - 1
    );
    if (!isPaused) {
      pausedAt.current = 0;
      startProgressBar(true);
    }
  }, [isPaused, slides.length, startProgressBar]);

  const goToNextSlide = useCallback(() => {
    setCurrentSlide((prevSlide) => 
      prevSlide === slides.length - 1 ? 0 : prevSlide + 1
    );
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
                {/* Player container div */}
                <div
                  id={`player-${index}`}
                  ref={el => videoRefs.current[index] = el}
                  className="w-full h-full absolute top-0 left-0"
                ></div>
                
                {/* Loading indicator */}
                {(!isLoaded[index] || !playerReady[index]) && (
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
