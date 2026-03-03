// Mock data for Vikinger-style landing page

export const mockProfile = {
  id: "user-1",
  name: "Marina Valentine",
  username: "@marina",
  avatarUrl: "/stat/01.jpg",
  coverUrl:
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80",
  level: 24,
  levelProgress: 0.74,
  bio: "Digital artist and gaming enthusiast. Creating worlds one pixel at a time. Streaming every weekend!",
  location: "Los Angeles, CA",
  joinedDate: "12th May 2023",
  website: "marina.design",
  stats: {
    posts: 930,
    following: 82,
    followers: 3247,
  },
};

export const mockFriends = [
  {
    id: "friend-1",
    name: "Nick Grissom",
    avatarUrl: "https://i.pravatar.cc/150?img=11",
    isOnline: true,
  },
  {
    id: "friend-2",
    name: "Sarah Diamond",
    avatarUrl: "https://i.pravatar.cc/150?img=5",
    isOnline: true,
  },
  {
    id: "friend-3",
    name: "Jett Spiegel",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    isOnline: false,
  },
  {
    id: "friend-4",
    name: "Cassie May",
    avatarUrl: "https://i.pravatar.cc/150?img=9",
    isOnline: true,
  },
  {
    id: "friend-5",
    name: "Bearded Wonder",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    isOnline: false,
  },
  {
    id: "friend-6",
    name: "Lucas Rivers",
    avatarUrl: "https://i.pravatar.cc/150?img=53",
    isOnline: true,
  },
  {
    id: "friend-7",
    name: "Mia Chen",
    avatarUrl: "https://i.pravatar.cc/150?img=25",
    isOnline: false,
  },
  {
    id: "friend-8",
    name: "Alex Storm",
    avatarUrl: "https://i.pravatar.cc/150?img=68",
    isOnline: true,
  },
  {
    id: "friend-9",
    name: "Emma Wright",
    avatarUrl: "https://i.pravatar.cc/150?img=44",
    isOnline: false,
  },
];

export const mockPosts = [
  {
    id: "post-1",
    author: {
      name: "Marina Valentine",
      username: "@marina",
      avatarUrl: "https://i.pravatar.cc/150?img=47",
    },
    content:
      "Just finished this new concept art piece! What do you all think? 🎨✨ Working on more cyberpunk themed artwork for my upcoming collection.",
    images: [
      "https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80",
    ],
    timestamp: "2 hours ago",
    likes: 156,
    comments: [
      {
        id: "comment-1",
        author: {
          name: "Nick Grissom",
          avatarUrl: "https://i.pravatar.cc/150?img=11",
        },
        content: "This is absolutely stunning! Love the neon colors! 🔥",
        timestamp: "1 hour ago",
      },
      {
        id: "comment-2",
        author: {
          name: "Sarah Diamond",
          avatarUrl: "https://i.pravatar.cc/150?img=5",
        },
        content: "The detail on the reflections is insane! How long did this take?",
        timestamp: "45 mins ago",
      },
    ],
    shares: 23,
    hasLiked: true,
  },
  {
    id: "post-2",
    author: {
      name: "Sarah Diamond",
      username: "@sarahdiamond",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
    },
    content:
      "Amazing stream tonight everyone! Thank you for all the support 💜 We hit our donation goal and raised $2,500 for charity!",
    images: [],
    embed: {
      type: "discord",
      title: "Gaming Squad Server",
      description: "Join us for weekly gaming sessions!",
      memberCount: 1847,
      onlineCount: 342,
    },
    timestamp: "5 hours ago",
    likes: 289,
    comments: [
      {
        id: "comment-3",
        author: {
          name: "Marina Valentine",
          avatarUrl: "https://i.pravatar.cc/150?img=47",
        },
        content: "So proud of this community! You all are amazing! 💜",
        timestamp: "4 hours ago",
      },
    ],
    shares: 45,
    hasLiked: false,
  },
  {
    id: "post-3",
    author: {
      name: "Jett Spiegel",
      username: "@jettspiegel",
      avatarUrl: "https://i.pravatar.cc/150?img=12",
    },
    content:
      "New gaming setup is finally complete! RTX 4090 with custom water cooling. Ready for some serious streaming sessions 🎮",
    images: [
      "https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=800&q=80",
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&q=80",
      "https://images.unsplash.com/photo-1625842268584-8f3296236761?w=800&q=80",
    ],
    timestamp: "Yesterday",
    likes: 432,
    comments: [],
    shares: 67,
    hasLiked: true,
  },
];

export const mockStreams = [
  {
    id: "stream-1",
    title: "Late Night Gaming Session",
    streamer: "ProGamer_X",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80",
    viewers: 1243,
    isLive: true,
  },
  {
    id: "stream-2",
    title: "Art Commission Stream",
    streamer: "DigitalArtist",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    viewers: 856,
    isLive: true,
  },
  {
    id: "stream-3",
    title: "Speedrun Challenge",
    streamer: "SpeedRunner99",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80",
    viewers: 2341,
    isLive: false,
  },
];

export const mockPhotos = [
  {
    id: "photo-1",
    url: "https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?w=300&q=80",
    alt: "Gaming setup",
  },
  {
    id: "photo-2",
    url: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80",
    alt: "Retro gaming",
  },
  {
    id: "photo-3",
    url: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=300&q=80",
    alt: "Controller",
  },
  {
    id: "photo-4",
    url: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&q=80",
    alt: "Gaming room",
  },
  {
    id: "photo-5",
    url: "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=300&q=80",
    alt: "Neon lights",
  },
  {
    id: "photo-6",
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=80",
    alt: "Tech gear",
  },
  {
    id: "photo-7",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80",
    alt: "Cosplay",
  },
  {
    id: "photo-8",
    url: "https://images.unsplash.com/photo-1605901309584-818e25960a8f?w=300&q=80",
    alt: "Gaming event",
  },
  {
    id: "photo-9",
    url: "https://images.unsplash.com/photo-1552820728-8b83bb6b2b0b?w=300&q=80",
    alt: "Pixel art",
  },
];

export const mockPrograms = [
  {
    id: "program-1",
    name: "Web Development",
    price: 299,
    imageUrl: "/stat/01.jpg",
  },
  {
    id: "program-2",
    name: "Mobile App Design",
    price: 399,
    imageUrl: "/stat/02.jpg",
  },
  {
    id: "program-3",
    name: "Data Science",
    price: 499,
    imageUrl: "/stat/03.jpg",
  },
  {
    id: "program-4",
    name: "UI/UX Mastery",
    price: 349,
    imageUrl: "/stat/04.jpg",
  },
];

export const mockEvents = [
  {
    id: "event-1",
    name: "Web Development Workshop",
    date: "2025-02-26",
    time: "10:00 AM - 2:00 PM",
    description: "Learn the fundamentals of modern web development with React and Next.js.",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80",
  },
  {
    id: "event-2",
    name: "Design Meetup",
    date: "2025-03-05",
    time: "6:00 PM - 9:00 PM",
    description: "Connect with fellow designers and share your latest projects.",
    imageUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=400&q=80",
  },
  {
    id: "event-3",
    name: "Coding Competition",
    date: "2025-03-15",
    time: "9:00 AM - 5:00 PM",
    description: "Test your skills against other developers in this exciting hackathon.",
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&q=80",
  },
];

export const mockLeaderboard = [
  {
    id: "leader-1",
    rank: 1,
    name: "Marina Valentine",
    programJoined: "Web Development",
    adcoin: 15280,
    avatarUrl: "/stat/01.jpg",
  },
  {
    id: "leader-2",
    rank: 2,
    name: "Nick Grissom",
    programJoined: "Data Science",
    adcoin: 12450,
    avatarUrl: "https://i.pravatar.cc/150?img=11",
  },
  {
    id: "leader-3",
    rank: 3,
    name: "Sarah Diamond",
    programJoined: "Mobile App Design",
    adcoin: 11890,
    avatarUrl: "https://i.pravatar.cc/150?img=5",
  },
  {
    id: "leader-4",
    rank: 4,
    name: "Jett Spiegel",
    programJoined: "UI/UX Mastery",
    adcoin: 10250,
    avatarUrl: "https://i.pravatar.cc/150?img=12",
  },
  {
    id: "leader-5",
    rank: 5,
    name: "Cassie May",
    programJoined: "Web Development",
    adcoin: 9870,
    avatarUrl: "https://i.pravatar.cc/150?img=9",
  },
  {
    id: "leader-6",
    rank: 6,
    name: "Lucas Rivers",
    programJoined: "Data Science",
    adcoin: 8540,
    avatarUrl: "https://i.pravatar.cc/150?img=53",
  },
  {
    id: "leader-7",
    rank: 7,
    name: "Mia Chen",
    programJoined: "Mobile App Design",
    adcoin: 7920,
    avatarUrl: "https://i.pravatar.cc/150?img=25",
  },
  {
    id: "leader-8",
    rank: 8,
    name: "Alex Storm",
    programJoined: "UI/UX Mastery",
    adcoin: 7150,
    avatarUrl: "https://i.pravatar.cc/150?img=68",
  },
  {
    id: "leader-9",
    rank: 9,
    name: "Emma Wright",
    programJoined: "Web Development",
    adcoin: 6480,
    avatarUrl: "https://i.pravatar.cc/150?img=44",
  },
  {
    id: "leader-10",
    rank: 10,
    name: "Bearded Wonder",
    programJoined: "Data Science",
    adcoin: 5920,
    avatarUrl: "https://i.pravatar.cc/150?img=33",
  },
  {
    id: "leader-11",
    rank: 11,
    name: "Olivia Parker",
    programJoined: "Web Development",
    adcoin: 5480,
    avatarUrl: "https://i.pravatar.cc/150?img=32",
  },
  {
    id: "leader-12",
    rank: 12,
    name: "Ryan Mitchell",
    programJoined: "Mobile App Design",
    adcoin: 5120,
    avatarUrl: "https://i.pravatar.cc/150?img=57",
  },
  {
    id: "leader-13",
    rank: 13,
    name: "Sophie Turner",
    programJoined: "UI/UX Mastery",
    adcoin: 4780,
    avatarUrl: "https://i.pravatar.cc/150?img=23",
  },
  {
    id: "leader-14",
    rank: 14,
    name: "Daniel Kim",
    programJoined: "Data Science",
    adcoin: 4350,
    avatarUrl: "https://i.pravatar.cc/150?img=60",
  },
  {
    id: "leader-15",
    rank: 15,
    name: "Grace Wilson",
    programJoined: "Web Development",
    adcoin: 3920,
    avatarUrl: "https://i.pravatar.cc/150?img=29",
  },
];

export const mockMarketplace = [
  {
    id: "item-1",
    name: "Pro Gaming Headset",
    price: 149,
    imageUrl: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=300&q=80",
    seller: "TechStore",
  },
  {
    id: "item-2",
    name: "Mechanical Keyboard",
    price: 199,
    imageUrl: "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=300&q=80",
    seller: "GearHub",
  },
  {
    id: "item-3",
    name: "Wireless Mouse",
    price: 79,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=300&q=80",
    seller: "GameZone",
  },
  {
    id: "item-4",
    name: "RGB Mousepad XL",
    price: 45,
    imageUrl: "https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=300&q=80",
    seller: "TechStore",
  },
];

export const mockVideoStreams = [
  {
    id: "video-1",
    title: "Live Coding Session",
    streamer: "CodeMaster",
    viewers: 1243,
    thumbnailUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80",
    isLive: true,
  },
  {
    id: "video-2",
    title: "Game Development",
    streamer: "DevGuru",
    viewers: 856,
    thumbnailUrl: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=80",
    isLive: true,
  },
  {
    id: "video-3",
    title: "Design Workshop",
    streamer: "DesignPro",
    viewers: 542,
    thumbnailUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    isLive: false,
  },
  {
    id: "video-4",
    title: "Music Production",
    streamer: "BeatMaker",
    viewers: 1891,
    thumbnailUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80",
    isLive: true,
  },
];

export const mockForumTopics = [
  {
    id: "forum-1",
    title: "Best practices for React hooks?",
    author: "Nick Grissom",
    authorAvatar: "https://i.pravatar.cc/150?img=11",
    replies: 24,
    timestamp: "2 weeks ago",
  },
  {
    id: "forum-2",
    title: "How to optimize database queries",
    author: "Sarah Diamond",
    authorAvatar: "https://i.pravatar.cc/150?img=5",
    replies: 18,
    timestamp: "3 weeks ago",
  },
  {
    id: "forum-3",
    title: "Tips for landing your first dev job",
    author: "Jett Spiegel",
    authorAvatar: "https://i.pravatar.cc/150?img=12",
    replies: 45,
    timestamp: "1 week ago",
  },
  {
    id: "forum-4",
    title: "Favorite VS Code extensions?",
    author: "Marina Valentine",
    authorAvatar: "/stat/01.jpg",
    replies: 32,
    timestamp: "4 weeks ago",
  },
];

export const mockTeamMembers = [
  {
    id: "team-1",
    name: "John Smith",
    role: "Lead Instructor",
    avatarUrl: "https://i.pravatar.cc/150?img=51",
  },
  {
    id: "team-2",
    name: "Emily Chen",
    role: "Senior Developer",
    avatarUrl: "https://i.pravatar.cc/150?img=45",
  },
  {
    id: "team-3",
    name: "Michael Brown",
    role: "UI/UX Designer",
    avatarUrl: "https://i.pravatar.cc/150?img=52",
  },
];

export type Profile = typeof mockProfile;
export type Friend = (typeof mockFriends)[number];
export type Post = (typeof mockPosts)[number];
export type Stream = (typeof mockStreams)[number];
export type Photo = (typeof mockPhotos)[number];
export type Program = (typeof mockPrograms)[number];
export type Event = (typeof mockEvents)[number];
export type LeaderboardEntry = (typeof mockLeaderboard)[number];
export type MarketplaceItem = (typeof mockMarketplace)[number];
export type VideoStream = (typeof mockVideoStreams)[number];
export type ForumTopic = (typeof mockForumTopics)[number];
export type TeamMember = (typeof mockTeamMembers)[number];
