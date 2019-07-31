import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  getAnswers,
  getIsAnswersInitialized,
  getIsQuestionsLoaded,
  getIsQuestionsLoading,
  getLoggedInUser,
  getQuestions,
  RootState
} from '../reducers';
import { combineLatest, throwError } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { HttpService } from '../services/http.service';
import { Question } from '../models/question';
import { FetchQuestions, FetchQuestionsFailed, FetchQuestionsSuccess } from '../actions/questions';
import { Router } from '@angular/router';
import { AppBootstraped } from '../actions/app';
import { Answer } from '../models/answer';
import { User } from '../models/user';
import { InitializeAnswers, UpdateAnswer } from '../actions/answers';
import { Constants } from '../utils/constants';

@Injectable({
  providedIn: 'root'
})
export class QuestionsMiddleware {
  private navigate: any;
  constructor(private store: Store<RootState>,
              private httpService: HttpService,
              private router: Router) {

  }

  fetchQuestions() {
    let isQuestionsLoading$ = this.store.select(getIsQuestionsLoading);
    let isQuestionsLoaded$ = this.store.select(getIsQuestionsLoaded);
    combineLatest(isQuestionsLoaded$, isQuestionsLoading$).pipe(
      take(1),
      map(([isLoaded, isLoading]) => isLoaded || isLoading),
      filter(res => !res),
      switchMap(() => {
        this.store.dispatch(new FetchQuestions());
        return this.httpService.get('/questions');
      }),
      catchError(err => throwError(err))
    ).subscribe((res: Question[]) => {
      if (res && res.length > 0) {
        this.router.navigate(['instructions']);
        this.store.dispatch(new AppBootstraped());
        this.store.dispatch(new FetchQuestionsSuccess(res));
        this.initializeAnswers(res);
      } else {
        this.store.dispatch(new FetchQuestionsFailed());
      }
    }, (err) => {
      console.log('[Error Questions]', err);
      this.store.dispatch(new FetchQuestionsFailed());
    });
  }

  getIsQuestionsLoading() {
    return this.store.select(getIsQuestionsLoading);
  }

  getQuestions() {
    return this.store.select(getQuestions);
  }

  getAnswers() {
    return this.store.select(getAnswers);
  }

  initializeAnswers(questions: Question[]) {
    const answers: Answer[] = [];
    const userId = localStorage.getItem(Constants.USER_ID);
    this.store.select(getIsAnswersInitialized).subscribe(res => {
      if (!res) {
        questions.forEach(q => {
          answers.push({
            question: q._id,
            answer: null,
            user: userId
          });
        });
        this.store.dispatch(new InitializeAnswers(answers));
      }
    });
  }

  updateAnswer(answer: Answer) {
    if (!answer.question) {
      return;
    }
    this.store.dispatch(new UpdateAnswer(answer));
  }

  submitTest() {
    this.getAnswers().pipe(
      take(1),
      switchMap((res: Answer[]) => {
        console.log('[Answers]', res);
        return this.httpService.post('/answersupdate', res);
      })
    ).subscribe(res => console.log(res));
    this.navigate.thankyou();
  }
}
