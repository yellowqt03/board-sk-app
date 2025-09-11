// 사용자별 투표 상태 관리 유틸리티

export type VoteType = 'like' | 'dislike' | null;

export interface VoteState {
  postId: number;
  commentId?: number;
  voteType: VoteType;
  timestamp: number;
}

// 로컬 스토리지에서 사용자 투표 상태 가져오기
export function getUserVoteState(postId: number, commentId?: number): VoteType {
  try {
    const stored = localStorage.getItem('userVotes');
    if (!stored) return null;
    
    const votes: VoteState[] = JSON.parse(stored);
    const vote = votes.find(v => 
      v.postId === postId && 
      (commentId ? v.commentId === commentId : !v.commentId)
    );
    
    return vote ? vote.voteType : null;
  } catch (error) {
    console.error('투표 상태 조회 오류:', error);
    return null;
  }
}

// 사용자 투표 상태 저장하기
export function setUserVoteState(postId: number, voteType: VoteType, commentId?: number): void {
  try {
    const stored = localStorage.getItem('userVotes');
    let votes: VoteState[] = stored ? JSON.parse(stored) : [];
    
    // 기존 투표 제거
    votes = votes.filter(v => 
      !(v.postId === postId && (commentId ? v.commentId === commentId : !v.commentId))
    );
    
    // 새 투표 추가 (null이 아닌 경우만)
    if (voteType) {
      votes.push({
        postId,
        commentId,
        voteType,
        timestamp: Date.now()
      });
    }
    
    // 오래된 투표 정리 (30일 이상)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    votes = votes.filter(v => v.timestamp > thirtyDaysAgo);
    
    localStorage.setItem('userVotes', JSON.stringify(votes));
  } catch (error) {
    console.error('투표 상태 저장 오류:', error);
  }
}

// 투표 상태 초기화
export function clearUserVoteState(postId: number, commentId?: number): void {
  try {
    const stored = localStorage.getItem('userVotes');
    if (!stored) return;
    
    let votes: VoteState[] = JSON.parse(stored);
    votes = votes.filter(v => 
      !(v.postId === postId && (commentId ? v.commentId === commentId : !v.commentId))
    );
    
    localStorage.setItem('userVotes', JSON.stringify(votes));
  } catch (error) {
    console.error('투표 상태 초기화 오류:', error);
  }
}

// 투표 타입에 따른 버튼 스타일 반환
export function getVoteButtonStyle(
  currentVote: VoteType, 
  targetVote: 'like' | 'dislike',
  isProcessing: boolean
): string {
  if (isProcessing) {
    return targetVote === 'like' 
      ? 'bg-blue-200 text-blue-700 cursor-not-allowed'
      : 'bg-red-200 text-red-700 cursor-not-allowed';
  }
  
  if (currentVote === targetVote) {
    return targetVote === 'like'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-red-600 text-white hover:bg-red-700';
  }
  
  return targetVote === 'like'
    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
    : 'bg-red-50 text-red-600 hover:bg-red-100';
}
