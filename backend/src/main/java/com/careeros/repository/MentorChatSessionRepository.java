package com.careeros.repository;

import com.careeros.entity.MentorChatSession;
import com.careeros.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MentorChatSessionRepository extends JpaRepository<MentorChatSession, Long> {
    List<MentorChatSession> findByUserOrderByCreatedAtDesc(User user);
}
